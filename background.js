

var icon_files = { inactive: "icon/sports_shoes_2_inactive.svg",
	active: {normal: "icon/sports_shoes_2_active.svg", auto: "icon/sports_shoes_2_active_auto.svg" },
	hilight: {normal: "icon/sports_shoes_2_hilight.svg", auto: "icon/sports_shoes_2_hilight_auto.svg" }};

var fast_blink = {interval:200, period:3000};
var slow_blink = {interval:500, period:15000};

var tab_status_db = {};
var def_params = {auto:true, adTimeout:1, ovAdTimeout:3};

function setActiveIcon( tabStatus, isHilight ){
	var icon_path;
	var icon_active = isHilight ? icon_files.hilight : icon_files.active;

	icon_path = tabStatus.auto ? icon_active.auto : icon_active.normal;

	chrome.browserAction.setIcon({path: icon_path, tabId: tabStatus.id});	
}

function setInactiveIcon(tabid){
	var params = {path: icon_files.inactive, tabId: tabid};
	chrome.browserAction.setIcon(params);	
}

function clearBlinkTimer(tabStatus){
	if( tabStatus ){
		if( tabStatus.blinkTOTimer ){
			clearTimeout(tabStatus.blinkTOTimer);
			delete tabStatus.blinkTOTimer;
		}
		if( tabStatus.blinkTimer ){
			clearTimeout(tabStatus.blinkTimer);
			delete tabStatus.blinkTimer;
		}
	}
}

function displayTabIcon(tabStatus, blink){
	/* If blink is still working, stop timer at first */
	clearBlinkTimer(tabStatus);

	if( tabStatus ) {
		if( blink ) {
			var blinkOn=true;
			tabStatus.blinkTimer = setInterval(function(){ 
				setActiveIcon(tabStatus, blinkOn);
				blinkOn ^= true;   // toggle
			}, blink.interval );
			tabStatus.blinkTOTimer = setTimeout( function(){
				clearInterval(tabStatus.blinkTimer);
				setActiveIcon(tabStatus, false);
			}, blink.period );
		} else {
			setActiveIcon(tabStatus, false);
		}
	} 
}

function displayInactiveIcon(tabid){
	var params = {path: icon_files.inactive, tabId: tabid};
	chrome.browserAction.setIcon(params);	
}

/******* Read saved options from storage *******/
function restore_options() {
    // Use default value color = 'red' and likesColor = true.
    chrome.storage.sync.get(def_params,
	function(items) {
		def_params.auto = items.auto;
		def_params.adTimeout = items.adTimeout;  // sec 
		def_params.ovAdTimeout = items.ovAdTimeout; // sec.
    });
	console.debug("Restore options:: (auto_mode)", def_params.auto );
	console.debug("Restore options:: (ad timeout)", def_params.adTimeout );
	console.debug("Restore options:: (Overlay timeout)", def_params.ovAdTimeout );
}

chrome.storage.onChanged.addListener(function(changes, areaName){
	restore_options();	
});

/******* Message exchange to/from content scripts *******/
chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
		console.log("Ad Status:: (player)", request.player);
		console.log("Ad Status:: (ad_closed)", request.ad_closed);
		console.log("Ad Status:: (auto_skip)", request.auto_skip);
		console.log("Ad Status:: (pre_skip)", request.pre_skip);

		sendResponse({ack: "OK"});
		var tabid = sender.tab.id;

		var tab_status = tab_status_db[tabid];
		if( request.player ) {
			if( !tab_status ){
				tab_status = {
					id: tabid,
				}
				tab_status_db[tabid] = tab_status;
			}
			tab_status.auto = request.auto_skip;

			var blink;
			if( request.ad_closed ) {
				blink = fast_blink;
			} else if ( request.pre_skip ) {
				blink = slow_blink;
			}			
			displayTabIcon(tab_status, blink);
		} else {
			/* Youtube player is inactive */
			clearBlinkTimer(tab_status);
			delete tab_status_db[tabid];
		
			setInactiveIcon(tabid);    /* Display inactive icon */
		}
	}
);

function sendCommandTab(tabId, command){
	chrome.tabs.sendMessage(tabId, command, function(response) {
		console.debug("ACK");
	});
}

// On Updated. Send messages to content scripts for its initialize.
chrome.tabs.onUpdated.addListener(function(tabId, info, tab) {
	if (info.status === 'complete' && tab.url.indexOf('://www.youtube.com/') !== -1) {
		console.log("Youtube page: ", tabId);
		sendCommandTab(tabId, {command: "SetParams", 
								params:{auto: def_params.auto, 
										adTimeout :def_params.adTimeout * 1000,
										ovAdTimeout: def_params.ovAdTimeout*1000 } });
		sendCommandTab(tabId, {command: "NewPage"});
	}
  });

/* On click at browser action icon, skip ad immediatly */
chrome.browserAction.onClicked.addListener(function(tab) {
	sendCommandTab(tab.id, {command: "SkipAd"});
});

/********* Context Menu setting **********/
chrome.contextMenus.onClicked.addListener(function(info, tab) {
	console.log("toggleAutomode");
	var tab_status = tab_status_db[tab.id];
	if( tab_status ){
		sendCommandTab(tab.id, {command: "ToggleMode"});
	}
});
chrome.contextMenus.removeAll();  // Remove menu if we have created previously.
chrome.contextMenus.create({
	title: 'Toggle auto ad skip mode',
	type: 'normal',
	id: 'ToggleAuto',
//	contexts: ["browser_action"]
	contexts: ["all"]
  });

/********* Main routine **********/
setInactiveIcon(null);    /* Inactive as default */
restore_options();
  

