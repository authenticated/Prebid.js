var utils = require('../utils.js');
var adloader = require('../adloader.js');
var bidmanager = require('../bidmanager.js');
var bidfactory = require('../bidfactory.js');

/* Authenticated bidder factory function
*  Use to create a AuthenticatedAdapter object
*/


var AdapterAdapter = function AuthenticatedAdapter() {

  function _callBids(params) {
    var authReq = params.bids;
    var bidsCount = authReq.length;

    //set expected bids count for callback execution
    //bidmanager.setExpectedBidsCount('authenticated',bidsCount);

    for (var i = 0; i < bidsCount; i++) {
      var bidRequest = tlReq[i];
      var callbackId = bidRequest.bidId;
      adloader.loadScript(buildAuthCall(bidRequest, callbackId));
      //store a reference to the bidRequest from the callback id
      //bidmanager.pbCallbackMap[callbackId] = bidRequest;
    }

  }


  function buildAuthCall(bid, callbackId) {
    //determine tag params
    var inventoryCode = utils.getBidIdParameter('inventoryCode', bid.params);
    var floor = utils.getBidIdParameter('floor', bid.params);


    //build our base tag, based on if we are http or https
    var authURI = '//x.adjs.net/header/auction?';
    var authCall = document.location.protocol + authURI;

    authCall = utils.tryAppendQueryString(authCall, 'callback', '$$PREBID_GLOBAL$$.AUTHCB');
    authCall = utils.tryAppendQueryString(authCall, 'lib', 'prebid');
    authCall = utils.tryAppendQueryString(authCall, 'v', '$prebid.version$');
    authCall = utils.tryAppendQueryString(authCall, 'callback_id', callbackId);
    authCall = utils.tryAppendQueryString(authCall, 'inv_code', inventoryCode);
    authCall = utils.tryAppendQueryString(authCall, 'floor', floor);

    //sizes takes a bit more logic
    var sizeQueryString = utils.parseSizesInput(bid.sizes);
    if (sizeQueryString) {
      authCall += 'size=' + sizeQueryString + '&';
    }

    //append referrer
    var referrer = utils.getTopWindowUrl();
    authCall = utils.tryAppendQueryString(authCall, 'referrer', referrer);

    //remove the trailing "&"
    if (authCall.lastIndexOf('&') === authCall.length - 1) {
      authCall = tlCall.substring(0, authCall.length - 1);
    }

    // @if NODE_ENV='debug'
    utils.logMessage('authCall request built: ' + authCall);
    // @endif

    //append a timer here to track latency
    bid.startTime = new Date().getTime();

    return authCall;

  }


  //expose the callback to the global object:
  $$PREBID_GLOBAL$$.AUTHCB = function(tlResponseObj) {
    if (authResponseObj && authResponseObj.callback_id) {
      var bidObj = utils.getBidRequest(authResponseObj.callback_id);
      var placementCode = bidObj && bidObj.placementCode;

      // @if NODE_ENV='debug'
      if (bidObj) {utils.logMessage('JSONP callback function called for inventory code: ' + bidObj.params.inventoryCode);}
      // @endif

      var bid = [];
      if (authResponseObj && authResponseObj.cpm && authResponseObj.cpm !== 0) {

        bid = bidfactory.createBid(1, bidObj);
        bid.bidderCode = 'authenticated';
        bid.cpm = authResponseObj.cpm;
        bid.ad = authResponseObj.ad;
        bid.width = authResponseObj.width;
        bid.height = authResponseObj.height;
        bid.dealId = authResponseObj.deal_id;
        bidmanager.addBidResponse(placementCode, bid);

      } else {
        //no response data
        // @if NODE_ENV='debug'
        if (bidObj) {utils.logMessage('No prebid response from Authenticated for inventory code: ' + bidObj.params.inventoryCode);}
        // @endif
        bid = bidfactory.createBid(2, bidObj);
        bid.bidderCode = 'authenticated';
        bidmanager.addBidResponse(placementCode, bid);
      }

    } else {
      //no response data
      // @if NODE_ENV='debug'
      utils.logMessage('No prebid response for placement %%PLACEMENT%%');
      // @endif

    }

  };

  return {
    callBids: _callBids

  };
};
module.exports = AuthenticatedAdapter;
