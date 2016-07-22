// Factory "morphs" into a Pudding class.
// The reasoning is that calling load in each context
// is cumbersome.

(function() {

  var contract_data = {
    abi: [{"constant":true,"inputs":[],"name":"getState","outputs":[{"name":"state","type":"uint256"}],"type":"function"},{"constant":true,"inputs":[],"name":"getVerified","outputs":[{"name":"status","type":"bool"}],"type":"function"},{"constant":true,"inputs":[],"name":"getClient","outputs":[{"name":"client","type":"address"}],"type":"function"},{"constant":false,"inputs":[{"name":"newClient","type":"address"},{"name":"time","type":"uint64"}],"name":"verifyPresence","outputs":[],"type":"function"},{"constant":false,"inputs":[{"name":"val","type":"bool"}],"name":"setVerified","outputs":[],"type":"function"},{"constant":false,"inputs":[{"name":"time","type":"uint64"}],"name":"setTimeVerified","outputs":[],"type":"function"},{"constant":false,"inputs":[{"name":"newClient","type":"address"}],"name":"setClient","outputs":[],"type":"function"},{"constant":true,"inputs":[],"name":"getTimeVerified","outputs":[{"name":"time","type":"uint256"}],"type":"function"},{"constant":false,"inputs":[{"name":"val","type":"uint256"}],"name":"setState","outputs":[],"type":"function"},{"constant":false,"inputs":[],"name":"resetAll","outputs":[],"type":"function"}],
    binary: "60606040526101c9806100126000396000f3606060405236156100825760e060020a60003504631865c57d8114610084578063406e67091461008e57806359dc735c1461009c5780636e7b5788146100a457806372f10ff4146100df5780637e14d2c1146100f25780638526690a14610111578063a771fdc51461012a578063a9e966b714610144578063e103aef51461014f575b005b6101795b60005b90565b61018b60025460ff1661008b565b61019f610088565b60008054600160a060020a0319166004351790556002805468ffffffffffffffff001916602435610100021790556001805481019055610082565b6002805460ff1916600435179055610082565b6002805468ffffffffffffffff00191661010060043502179055610082565b60008054600160a060020a031916600435179055610082565b610179600254610100900467ffffffffffffffff1661008b565b600435600155610082565b6100826002805468ffffffffffffffffff1916905560008054600160a060020a0319168155600155565b60408051918252519081900360200190f35b604080519115158252519081900360200190f35b6040805173ffffffffffffffffffffffffffffffffffffffff929092168252519081900360200190f3",
    unlinked_binary: "60606040526101c9806100126000396000f3606060405236156100825760e060020a60003504631865c57d8114610084578063406e67091461008e57806359dc735c1461009c5780636e7b5788146100a457806372f10ff4146100df5780637e14d2c1146100f25780638526690a14610111578063a771fdc51461012a578063a9e966b714610144578063e103aef51461014f575b005b6101795b60005b90565b61018b60025460ff1661008b565b61019f610088565b60008054600160a060020a0319166004351790556002805468ffffffffffffffff001916602435610100021790556001805481019055610082565b6002805460ff1916600435179055610082565b6002805468ffffffffffffffff00191661010060043502179055610082565b60008054600160a060020a031916600435179055610082565b610179600254610100900467ffffffffffffffff1661008b565b600435600155610082565b6100826002805468ffffffffffffffffff1916905560008054600160a060020a0319168155600155565b60408051918252519081900360200190f35b604080519115158252519081900360200190f35b6040805173ffffffffffffffffffffffffffffffffffffffff929092168252519081900360200190f3",
    address: "",
    generated_with: "2.0.9",
    contract_name: "TestContract"
  };

  function Contract() {
    if (Contract.Pudding == null) {
      throw new Error("TestContract error: Please call load() first before creating new instance of this contract.");
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
      throw new Error("TestContract error: Please call load() first before calling new().");
    }

    return Contract.Pudding.new.apply(Contract, arguments);
  };

  Contract.at = function() {
    if (Contract.Pudding == null) {
      throw new Error("TestContract error: Please call load() first before calling at().");
    }

    return Contract.Pudding.at.apply(Contract, arguments);
  };

  Contract.deployed = function() {
    if (Contract.Pudding == null) {
      throw new Error("TestContract error: Please call load() first before calling deployed().");
    }

    return Contract.Pudding.deployed.apply(Contract, arguments);
  };

  if (typeof module != "undefined" && typeof module.exports != "undefined") {
    module.exports = Contract;
  } else {
    // There will only be one version of Pudding in the browser,
    // and we can use that.
    window.TestContract = Contract;
  }

})();
