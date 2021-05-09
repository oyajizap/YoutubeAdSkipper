// Saves options to chrome.storage
function save_options() {
    var auto_mode = (document.getElementById('skip-mode').value == "Auto");
    var adTimeout = document.getElementById('ad-skip-to').value;
    var ovAdTimeout = document.getElementById('ol-ad-skip-to').value;
    chrome.storage.sync.set({
        auto:auto_mode, 
        adTimeout:adTimeout, 
        ovAdTimeout:ovAdTimeout
    }, function() {
        // Update status to let user know options were saved.
        var status = document.getElementById('status');
        status.textContent = 'Options saved.';
        setTimeout(function() {
            status.textContent = '';
        }, 750);
    });
}

// Timeout setting is only available in auto skip mode.
function SetTOFieldAvailable(mode){
    var to_setting_disable = true;
    if( mode == "Auto" ){
        to_setting_disable = false;
    }
    document.getElementById("ad-skip-to").disabled = to_setting_disable;
    document.getElementById("ol-ad-skip-to").disabled = to_setting_disable;

}
  // Restores settings and set those values to UI.
function restore_options() {
    chrome.storage.sync.get({
        auto:true, 
        adTimeout:1, 
        ovAdTimeout:3
    }, function(items) {
        var mode_value = items.auto ? "Auto" : "Manual"; 
        document.getElementById('skip-mode').value = mode_value;
        document.getElementById('ad-skip-to').value = items.adTimeout;
        document.getElementById('ol-ad-skip-to').value = items.ovAdTimeout;
        SetTOFieldAvailable(mode_value);
    });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
document.getElementById('skip-mode').addEventListener('input',
    function(evt) {
        SetTOFieldAvailable(evt.target.value);
    });
console.log("Option Loaded");
