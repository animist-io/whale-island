var path = require('path');
var gulp = require('gulp');
var excludeGitignore = require('gulp-exclude-gitignore');
var mocha = require('gulp-mocha');
var istanbul = require('gulp-istanbul');
var nsp = require('gulp-nsp');
var plumber = require('gulp-plumber');
var babel = require('gulp-babel');
var documentation = require('gulp-documentation');
var docsBleno = require('gulp-documentation-bleno');
var concat = require('gulp-concat');
var del = require('del');
var isparta = require('isparta');

// Initialize the babel transpiler so ES2015 files gets compiled
// when they're loaded
require('babel-core/register');

gulp.task('documentation', function () {
  gulp.src('./lib/eth.js')
    .pipe(documentation( 'md', { shallow: 'true', github: 'true', filename: 'eth.md' }))
    .pipe(gulp.dest('docs'));

  gulp.src('./lib/handlers.js')
    .pipe(docsBleno('md', { shallow: 'true', github: 'true', filename: 'handlers.md' }))
    .pipe(gulp.dest('docs'));

  gulp.src('./lib/util.js')
    .pipe(documentation('md', { shallow: 'true', github: 'true', filename: 'util.md' }))
    .pipe(gulp.dest('docs'));

  gulp.src('./lib/events.js')
    .pipe(documentation('md', { shallow: 'true', github: 'true', filename: 'events.md' }))
    .pipe(gulp.dest('docs'));

  gulp.src('./lib/server.js')
    .pipe(documentation('md', { shallow: 'true', github: 'true', filename: 'server.md' }))
    .pipe(gulp.dest('docs'));

  gulp.src('./lib/requestableBeacon.js')
    .pipe(documentation('md', { shallow: 'true', github: 'true', filename: 'requestableBeacon.md' }))
    .pipe(gulp.dest('docs'));

  gulp.src([
          './docs/top.md', 
          './docs/handlersDesc.md',
          './docs/handlers.md'] )
  
    .pipe(concat('README.md'))
    .pipe(gulp.dest('./'));
});

gulp.task('nsp', function (cb) {
  // stopOnError disabled to temporarily manage issue #14: DO NOT DO THIS.
  nsp({package: path.resolve('package.json'), stopOnError: false }, cb);
});

gulp.task('pre-test', function () {
  return gulp.src('lib/**/*.js')
    .pipe(excludeGitignore())
    .pipe(istanbul({
      includeUntested: true,
      instrumenter: isparta.Instrumenter
    }))
    .pipe(istanbul.hookRequire());
});

gulp.task('test', ['pre-test'], function (cb) {
  var mochaErr;

  // Exclude files by adding: '!test/...etc' to array : , '!test/server.spec.js'
  gulp.src(['test/**/*.js']) ///['test/server.spec.js'])
    .pipe(plumber())
    .pipe(mocha({reporter: 'spec', timeout: 60000}))
    .on('error', function (err) {
      mochaErr = err;
    })
    .pipe(istanbul.writeReports())
    .on('end', function () {
      cb(mochaErr);
      process.exit();
    });
});

gulp.task('watch', function () {
  gulp.watch(['lib/**/*.js', 'test/**'], ['test']);
});

gulp.task('babel', ['clean'], function () {
  return gulp.src('lib/**/*.js')
    .pipe(babel())
    .pipe(gulp.dest('dist'));
});

gulp.task('clean', function () {
  return del('dist');
});

gulp.task('prepublish', ['nsp', 'babel']);
gulp.task('default', ['static', 'test']);
