console.debug("Loaded.");

/* Check whether ad element is visible or not */
function visible_style(elem){
	if( ('display' in elem.style) && (elem.style.display == 'none' ) ){
		return false;
	} else {
		return true;
	}

}


// Constructor of AdSkip object
function AdSkip(player){
	this.exist = false;
	this.can_skip = false;
	var skip_ad_slot = player.getElementsByClassName("ytp-ad-skip-ad-slot")[0];

	if( skip_ad_slot) {
		var button_slot = skip_ad_slot.getElementsByClassName("ytp-ad-skip-button-slot")[0];
		if( button_slot && visible_style(button_slot)) {
			this.exist = true;
			this.can_skip = true;
			this.skip_button = button_slot.getElementsByClassName("ytp-ad-skip-button")[0];
		} else {
			var preview_slot = skip_ad_slot.getElementsByClassName("ytp-ad-preview-slot")[0];
			if( preview_slot && visible_style(preview_slot)) {
				this.exist = true;
				this.pre_count = preview_slot.getElementsByClassName("ytp-ad-preview-text")[0].textContent;
			}
		}
	}

	this.close = function(){
		if(this.exist && this.can_skip){
			this.skip_button.click();
		}
	}
}

// Constructor of overlay ad object
function OverlayAd(player)
{
	this.exist = false;
	var overlay_cntnr = player.getElementsByClassName("ytp-ad-overlay-container")[0];

	if( overlay_cntnr ) {
		var ad_overlay = overlay_cntnr.getElementsByClassName("ytp-ad-text-overlay")[0];
		if( ad_overlay && visible_style(ad_overlay)) {
			this.exist = true;
		} else {
			ad_overlay = overlay_cntnr.getElementsByClassName("ytp-ad-image-overlay")[0];
			if( ad_overlay && visible_style(ad_overlay)) {
				this.exist = true;
			}		
		}
		if( this.exist )
		{
			this.ad_overlay_close = ad_overlay.getElementsByClassName("ytp-ad-overlay-close-button")[0];
		}

	}

	this.close = function(){
		if(this.exist){
			this.ad_overlay_close.click();
		}
	}
}

/* Overall ad handler */
const adHandler = {
	auto_skip : false,
	pre_skip : false,
	hold_skip: false,
	vplayer: null,
	ad_timeout: 10000,
	ovad_timeout: 10000,
	skip_timer: null,
	
	setParams : function(params){
		this.auto_skip = params.auto;
		this.ad_timeout = params.adTimeout;
		this.ovad_timeout = params.ovAdTimeout;
		console.debug("SetParams:: ", this.auto_skip, this.ad_timeout, this.ovad_timeout);
	},

	clearRetryTimer : function(){
		if( this.retryTimer ){
			clearTimeout(this.retryTimer);
		}
	},

	startRetryTimer : function(){
		this.clearRetryTimer();
		console.debug("startRetryTimer");
		this.retryTimer = setTimeout( function(){
			console.debug("WDTimer:: Timeout", (adHandler.vplayer !== undefined) );
			/* If youtube player has not been found, retry later once */
			if(!adHandler.vplayer) {
				adHandler.updatePlayer();
			}
		}, 1000);  // Timeout = 1sec
	},

	updatePlayer : function(){
		var new_player = document.getElementsByClassName("html5-video-player")[0];
		if( new_player !== this.vplayer ){
			console.debug("Updated Player: ", new_player);
			var new_auto_skip = this.auto_skip;
			var new_pre_skip = this.new_skip;
			if( !new_player ){
				//new_auto_skip = false;
				new_pre_skip = false;
				this.hold_skip = false;
			} else {
				this.clearRetryTimer();   // Retry timer is no longer needed.
			}
			this.updateAllStatus(new_player, false, new_auto_skip, new_pre_skip );
		}
	},

	closeAdIfExist : function(immediate){
		var ad_closed = false;
		var new_pre_skip = false;
		/*
		 * immediate:: True in Pressing 'S' key or SkipTimeout case.
		 *    We will skip as soon as possible.
		 * Otherwise, we will skip after certain timeout.
		 * 'Pre-skip" mode :: During pre-count or timer wait.
		 */
		if( immediate || this.auto_skip || this.hold_skip ) {
			this.updatePlayer();
			if (this.vplayer) {
				//console.debug("Found Video Player");
				var ad_skip = new AdSkip(this.vplayer);
				if( ad_skip.exist ) {
					if( ad_skip.can_skip ) {
						console.debug("Ad Skip: ", ad_skip);
						if( immediate || this.hold_skip ){
							ad_skip.close();
							ad_closed = true;
							this.hold_skip = false;	
						} else {
							if( !this.skip_timer ){
								console.debug("Ad skip. Start Timer:: ", this.ad_timeout);
								this.skip_timer = setTimeout( function(){
									adHandler.closeAdIfExist(true);
									adHandler.skip_timer = null;
								}, this.ad_timeout );
							} 
							new_pre_skip = true;
						}

					} else if( ad_skip.pre_count ){
						new_pre_skip = true;
						if( immediate ){
							this.hold_skip = true;
						}
					}
				}
				var overlay_ad = new OverlayAd(this.vplayer);
				if( overlay_ad.exist ){
					console.debug("Overlay Ad: ", overlay_ad);
					if( immediate || this.hold_skip ){
						overlay_ad.close();
						ad_closed = true;
						this.hold_skip = false;	
					} else {
						if( !this.skip_timer ){
							console.debug("Ad skip. Start Timer:: ", this.ovad_timeout);
							this.skip_timer = setTimeout( function(){
								adHandler.closeAdIfExist(true);
								adHandler.skip_timer = null;
							}, this.ovad_timeout );
						}
						new_pre_skip = true;
					}
				}
				this.updateAllStatus(this.vplayer, ad_closed, this.auto_skip, new_pre_skip);
			}
		}
	},

	updateAllStatus : function(new_player, ad_closed, new_auto_skip, new_pre_skip){
		var mode_changed = false;
		if( this.vplayer != new_player){
			this.vplayer = new_player;
			mode_changed = true;
		}
		if( this.auto_skip != new_auto_skip) {
			this.auto_skip = new_auto_skip;
			mode_changed = true;
		}
		if( this.pre_skip != new_pre_skip ) {
			this.pre_skip = new_pre_skip;
			mode_changed = true;
		}
		if( ad_closed || mode_changed ){
			console.debug("Ad Status:: (ad_closed)", ad_closed);
			console.debug("Ad Status:: (auto_skip)", this.auto_skip);
			console.debug("Ad Status:: (pre_skip)", this.pre_skip);

			this.sendAdStatus( ad_closed );
		}
	},

	updateAutoSkip : function(new_auto_skip){
		this.updateAllStatus(this.vplayer, false, new_auto_skip, this.pre_skip);
	},

	toggleAutoSkip : function(){
		this.updateAutoSkip(!this.auto_skip);
	},

	sendAdStatus : function(ad_closed ) {
		var status = {ad_closed : ad_closed, auto_skip : this.auto_skip,
						 pre_skip : this.pre_skip, player: (this.vplayer !== "undefined") };
		chrome.runtime.sendMessage(status, function(response) {
			console.debug(response.ack);
		});
	},

}

function youtubeOnload(){
	// Send initial status on init stage.
	adHandler.updatePlayer( );

	if( adHandler.vplayer ){
	//console.debug("Registering Event Listner");
		const video = document.querySelector('video');
		video.addEventListener('timeupdate', (event) => {
			//console.debug("time update");
			adHandler.closeAdIfExist(false);

		});
	} else {
		adHandler.startRetryTimer();
	}
}

chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
		console.debug("Command:", request.command);
		switch (request.command){
			case "NewPage":
				youtubeOnload();
				break;

			case "SetParams":
				adHandler.setParams(request.params);
				break;

			case "SkipAd":
				adHandler.closeAdIfExist(true);
				break;

			case "ToggleMode":
				var new_mode = (adHandler.auto_skip) ? false : true;
				adHandler.updateAutoSkip(new_mode);
				break;
		}
		sendResponse({ack: "OK"});
	}
);

/* Shortcut key detection */
window.addEventListener("keydown", function(event){
	if( event.code == "KeyS"){
		if( event.shiftKey ) {
			console.debug("Shift + S key pressed");
			adHandler.toggleAutoSkip();
		} else {
			console.debug("Skip Ad");
			adHandler.closeAdIfExist(true);
		}
	}
});