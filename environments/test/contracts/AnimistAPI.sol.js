// Factory "morphs" into a Pudding class.
// The reasoning is that calling load in each context
// is cumbersome.

(function() {

  var contract_data = {
    abi: [{"constant":false,"inputs":[{"name":"client","type":"address"},{"name":"time","type":"uint64"}],"name":"verifyPresence","outputs":[],"type":"function"}],
    binary: "6060604052601e8060106000396000f3606060405260e060020a60003504636e7b57888114601a575b005b601856",
    unlinked_binary: "6060604052601e8060106000396000f3606060405260e060020a60003504636e7b57888114601a575b005b601856",
    address: "0xa40c571681ccb984b3993d03065ad6253cf25b63",
    generated_with: "2.0.9",
    contract_name: "AnimistAPI"
  };

  function Contract() {
    if (Contract.Pudding == null) {
      throw new Error("AnimistAPI error: Please call load() first before creating new instance of this contract.");
    }

    Contract.Pudding.apply(this, arguments);
  };

  Contract.load = function(Pudding) {
    Contract.Pudding = Pudding;

    Pudding.whisk(contract_data, Contract);

    // Return itself for backwards compatibility.
    return Contract;
  }

  Contract.new = function() {
    if (Contract.Pudding == null) {
      throw new Error("AnimistAPI error: Please call load() first before calling new().");
    }

    return Contract.Pudding.new.apply(Contract, arguments);
  };

  Contract.at = function() {
    if (Contract.Pudding == null) {
      throw new Error("AnimistAPI error: Please call load() first before calling at().");
    }

    return Contract.Pudding.at.apply(Contract, arguments);
  };

  Contract.deployed = function() {
    if (Contract.Pudding == null) {
      throw new Error("AnimistAPI error: Please call load() first before calling deployed().");
    }

    return Contract.Pudding.deployed.apply(Contract, arguments);
  };

  if (typeof module != "undefined" && typeof module.exports != "undefined") {
    module.exports = Contract;
  } else {
    // There will only be one version of Pudding in the browser,
    // and we can use that.
    window.AnimistAPI = Contract;
  }

})();
