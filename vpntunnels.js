jQuery.noConflict();

//one of the other libraries takes on '$' for itself, so need to do this so that our
//script will pass it on to jquery
( function($) {

$.fn.selectRange = function(start, end) {
	var e = document.getElementById($(this).attr('id')); // I don't know why... but $(this) don't want to work today :-/
	if (!e) return;
	else if (e.setSelectionRange) { e.focus(); e.setSelectionRange(start, end); } /* WebKit */ 
	else if (e.createTextRange) { var range = e.createTextRange(); range.collapse(true); range.moveEnd('character', end); range.moveStart('character', start); range.select(); } /* IE */
	else if (e.selectionStart) { e.selectionStart = start; e.selectionEnd = end; }
};


/*
common javascript
not loaded as external file because that introduces namespace problems I don't
feel like dealing with
-----------------------------------------------*/


function attachShowForm(elem) {
	var elem_id = $(elem).attr('id');
	var form_tail = elem_id.replace(/^.+_/, '');
	
	$(elem).click(function() {
		showForm(form_tail, elem, true);
	});
}

function checkErrors(return_val) {
	return_val = return_val.replace(/^\s+/, '');
	return_val = return_val.replace(/\s+$/, '');
	
	var return_array = return_val.split('::');
	var return_head = return_array[0];
	
	if (return_val.match(/^CONSOLE::([\s\S]*)/)) {
		console.log(RegExp.$1);
		hidePopups(true,true);
		return false;
	}
	
	if (return_val.match(/^ERROR::(.+)/)) {
		var msg = RegExp.$1;
		hidePopups(true,true);
		alert(msg);

		//make sure user isn't in a text input; if they are and they use enter to clear an
		//alert, form will resubmit and can get caught in a weird loop
		$("*:focus").blur();
		return false;
	}
	
	else if (
		!return_val.match(/^\S+::.+$/)
		&& return_val.toLowerCase() != 'ok'
		&& return_head.toLowerCase() != 'ok'
	) {
		hidePopups(true,true);
		alert("Sorry, an unexpected error occurred (msg: " + return_val + ")");
		return false;
	}
	
	return true;
}

function errorPopup(msg) {
	$('#popup_error_msg').html(msg);
	revealPopup('error', true);
}

function fillOutput(factor){
	name = $('#vpn_'+factor+'_name').val();
	ip = $('#vpn_type_'+factor).val();
	
	ajax_req = $.ajax({
		type		: 'Post',
		url			: 'vpntunnels_ajax.php',
		data		: 'ajax_function=getOutput'
					+ '&event_id=' + factor
					+ '&name=' + name
					+ '&ip=' + ip,
		dataType	: 'json',
		cache		: false,
		
		success:	function(return_val){
			$('#output').html(return_val);
		}
	});
}

function fillIpList(factor){
	ajax_req = $.ajax({
		type		: 'Post',
		url			: 'vpntunnels_ajax.php',
		data		: 'ajax_function=getIpList'
					+ '&event_id=' + factor,
		dataType	: 'json',
		cache		: false,
		
		success:	function(return_val){
			$('#vpn_type_' + factor + ' option').remove();
			$.each(return_val, function(index, value){
				$('#vpn_type_' + factor).append($('<option>').text(value).attr('value', value));
			});
		}
	});
}
/*
function getIpList_cb(return_val){
	var ips = jQuery.parseJSON(return_val);
	
	$("#vpn_type option").remove(); // Remove all <option> child tags.
	$.each(return_val, function(index, item) { // Iterates through a collection
		$("#vpn_type").append( // Append an object to the inside of the select box
			$("<option></option>")
				.text(item)
				.attr('item', item)
		);
	});
}*/

function getAppPopups() {
	ajax_req = $.ajax({
		type		: 'Post',
		url			: 'vpntunnels_ajax.php',
		data		: 'ajax_function=getAppPopups',
		cache		: false,

		success:	function(return_val) {
			getAppPopups_cb(return_val);
		}
	});
}

function getAppPopups_cb(return_val) {
	var popups = jQuery.parseJSON(return_val);
	
	if (!popups || popups.length < 0) {
		return false;
	}
	
	for (var i=0; i < popups.length; i++) {
		var popup = popups[i];
		var popup_name = popup['popup_name'];
		var popup_content = popup['content'];
		var popup_title = popup['title'];
		var popup_id = 'app_popup_' + popup_name;
		
		var popup_guts =
			"<div class='app_popup' id='" + popup_id + "' title='" + popup_title + "'>\n" +
			popup_content + "\n" + 
			"<input type='button' value='dismiss forever' class='app_popup_dismiss' id='app_popup_dismiss_" + popup_name + "' />\n" +
			"</div>";
		
		$('body').append(popup_guts);
		$('#' + popup_id).dialog();
		
		$('#app_popup_dismiss_' + popup_name).on('click touchend', function() {
			getAppPopups_dismiss(popup_name, popup_id);
		});
	}
}

function getAppPopups_dismiss(popup_name, popup_id) {
	$('#' + popup_id).dialog('close');
	
	ajax_req = $.ajax({
		type		: 'Post',
		url			: 'vpntunnels_ajax.php',
		data		: 'ajax_function=getAppPopups_dismiss'
					+ '&popup_name=' + popup_name,
		cache		: false
	});
}

function handleKeyShortcut(event) {
	var keycode = getKeyCode(event);
	
	var keypresses = {
		'13'	: ['ok','submit','continue'],	//Enter
		'27'	: ['cancel'],					//Cancel
		'70'	: ['fix']						//F
	};
	
	if (!keypresses[keycode]) {
		return false;
	}
	
	var target_btns = keypresses[keycode];
	
	//if there's an active popup, it wins
	if (active_popup) {
		handleKeyShortcut_popup(target_btns);
	}
	
	//otherwise if a form is open
	else {
		handleKeyShortcut_form(target_btns);
	}
}

function handleKeyShortcut_form(target_btns) {
	if (!active_form) {
		return false;
	}

	var target_form = 'vpn_form_' + active_form;

	//only bother if we're focus'd on an input in the target form
	if (!handleKeyShortcut_form_validFocus(target_form)) {
		return false;
	}

	//search through the active form for any buttons that match the targets for
	//the keypress (and are visible)
	$('#' + target_form).find('input').each(function() {
		var got_one = false;
		
		//build list of acceptable classes based on target_btns and see if it matches
		//this element
		for (var i=0; i < target_btns.length; i++) {
			var this_target = 'keypress_' + target_btns[i];
			if ($(this).hasClass(this_target) && $(this).is(':visible')) {
				$(this).click();
				got_one = true;
				break;
			}
		}
		
		if (got_one) {
			return false;
		}
	});
}

function handleKeyShortcut_form_validFocus(target_form) {
	var focus = $(':focus');
	
	if (focus.prop('tagName') != 'INPUT') {
		return false;
	}
	
	var good_input = false;
	focus.parents().each(function() {
		if ($(this).attr('id') == target_form) {
			good_input = true;
			return false;
		}
	});
	
	return good_input;
}

function handleKeyShortcut_popup(target_btns) {
	//search through the active popup for any buttons that match the target based
	//on the keypress
	$('#popup_' + active_popup).find('input').each(function() {
		var btn_tail = $(this).attr('id');
		btn_tail = btn_tail.replace(/^.+_popup_btn_/, '');
		for (var i=0; i < target_btns.length; i++) {
			var this_target = target_btns[i];
			if (this_target == btn_tail) {
				$(this).click();
			}
		}
	});
}

function hidePopups(cancel, force) {
	//ignore cancel behavior if invoked while "waiting" popup is active, because it will
	//prove to be a false cancel, since that graphic is only supposed to appear when we're
	//in the middle of an ajax call
	if (active_popup && active_popup == 'waiting' && !force) {
		return false;
	}
	
	$('#popup_' + active_popup).modal('hide');
	$('body').removeClass('modal-open');
	$('.modal-backdrop').remove();
	
	active_popup = false;
	
	if (cancel) {
		resetVars(false);
	}
}




function is_touch_device() {
	return 'ontouchstart' in window // works on most browsers 
		|| 'onmsgesturechange' in window; // works on ie10
};

function makeJsSafe(str) {
	str = str.replace(/\//g, '__SLASH__');
	str = str.replace(/\(/g, '__OPAREN__');
	str = str.replace(/\)/g, '__CPAREN__');
	
	return str;
}

function makeJsUnsafe(str) {
	str = str.replace(/__SLASH__/g, '/');
	str = str.replace(/__OPAREN__/g, '(');
	str = str.replace(/__CPAREN__/g, ')');
	
	return str;
}


function obeyLocationHash(rewrite) {
	var loc_data = parseLocationHash();
	
	if (loc_data) {
		switch(loc_data['form']) {
			case 'single':
				obeyLocationHash_single(loc_data, rewrite);
				break;
				
			case 'two':
				obeyLocationHash_two(loc_data, rewrite);
				break;
				
			case 'select':
				obeyLocationHash_select(loc_data, rewrite);
				break;
		}
	}
}

function obeyLocationHash_single(loc_data, rewrite) {
	try {
		$( '#vpn_form_forms_single' ).click();
	}
	catch (err) {
	}
}

function obeyLocationHash_two(loc_data, rewrite) {
	try{
		$( '#vpn_form_forms_two' ).click();
	}
	catch(err) {
	}
	
	if (loc_data['options']['filter']) {
		var the_filter = 'search_filter_' + loc_data['options']['filter'];
		if ($( '#' + the_filter )) {
			try {
				$( '#' + the_filter ).click();
			}
			catch (err) {
			}
		}
	}
}

function obeyLocationHash_select(loc_data, rewrite) {
	if (loc_data['options']['event_id'] && loc_data['options']['event_id'].match(/^\d+$/)) {
		addBehavior_selectSearchResult(loc_data['options']['event_id']);
	}
}

function parseLocationHash() {
	var loc_data = false;

	var loc_str = window.location.hash.replace(/^\#/, '');
	loc_str = loc_str.replace(/\%22/g, '"');
	
	try {
		loc_data = jQuery.parseJSON(loc_str);
	}
	
	catch (err) {
		return false;
	}
	
	return loc_data;
}

function revealPopup(target, hideable) {
	var target_id = 'popup_' + target;

	var backdrop_val = true;
	if (!hideable) {
		backdrop_val = 'static';
	}

	//make this global or else unpredictable when hide stuff in hidePopups()
	modal_options = {
		keyboard:	hideable,
		backdrop:	backdrop_val
	}


	//can't have two active modals the same time, so FIRST turn them all off
	hidePopups(false, true);

	//now create the one we want
	modal_options['show'] = true;
	$( '#' + target_id ).modal(modal_options);
	
	active_popup = target;
}


function setRadioGroup(group, value) {
	$('#' + group).find('input').each(function() {
		var this_val = $(this).val();
		
		if (this_val == value) {
			$(this).parent().addClass('active');
			$(this).prop('checked', true);
		}
		
		else {
			$(this).parent().removeClass('active');
			$(this).prop('checked', false);
		}
	});
}


//want some body clicks to trigger an action EXCEPT when a specific element
//within the body is clicked
function shouldSuppressClick(event, target_function, passed_params) {
	var shouldSuppress = false;

	var function_exclusions = {
		'toggleLeaseDataDisplay':	{
			'class'		: 'mac_result_row_moreleasedata',
			'params'	: {
				'direction'	: 'out'
			}
		}
	};

	//fetch the settings for the requested function
	var target_id = false;
	if (function_exclusions[target_function]['id']) {
		target_id = function_exclusions[target_function]['id'];
	}
	
	var target_class = false;
	if (function_exclusions[target_function]['class']) {
		target_class = function_exclusions[target_function]['class'];
	}
	
	var target_params = false;
	if (function_exclusions[target_function]['params']) {
		target_params = function_exclusions[target_function]['params'];
	}
	
	//does the id or class of what was clicked match the one that should be ignored?
	var clicked = event.target;
	var clicked_id = $(clicked).attr('id');
	var is_target = false;
	
	//if going by id
	if (target_id && clicked_id == target_id) {
		is_target = true;
	}
	
	else if (target_class && $(clicked).hasClass(target_class)) {
		is_target = true;
	}

	
	//if there are params, do they all match?
	var all_params_match = true;
	if (target_params) {
		for (var p_key in target_params) {
			if (passed_params[p_key]) {
				if (passed_params[p_key] != target_params[p_key]) {
					all_params_match = false;
				}
			} else {
				all_params_match = false;
			}
		}
	}
	
	if (is_target && all_params_match) {
		shouldSuppress = true;
	}
	
	return shouldSuppress;
}

function showForm(form_tail, elem, rewrite) {
	if (rewrite) {
		var options = {};
		if (form_tail == 'single') {
			options['event_id'] = 'single';
		}else if (form_tail == 'two'){
			options['event_id'] = 'two';
		}else if (form_tail == 'remove'){
			options['event_id'] = 'remove';
		}
		updateLocHash(form_tail, options);
	}

	$('#vpn_default').hide();
	$('.vpn_form').hide();
	$('#vpn_form_' + form_tail).show();
	
	//attach form behaviors where needed.
	//initiate action where needed
	switch (form_tail) {
		case 'single':
			setupSingleForm();
			break;
		
		case 'two':
			setupTwoForm();
			break;
	}
	
	active_form = form_tail;
}

function updateLocHash(key, options) {
	var hash_loc_array = {};
	
	hash_loc_array = {
			'form'		: key,
			'options'	: options
		};
	
	var hash_str = Object.toJSON(hash_loc_array);
	if (hash_str && hash_str != '{}' && hash_str != '[]') {
		window.location.hash = hash_str;
	}
}






// #mark -------------
// #mark global vars
// #mark -------------

/*
global vars
-----------------------------------------------*/

var active_form = false;
var active_form_type = false;
var active_popup = false;
var ajax_request = false;
var bubble_tree = {};
var core_from_systems = false;
var event_class = false;
var event_id = false;
var text_fields_touched = {};
var form_data = {};
var modal_options = {};
var pause_search = false;
var search_results = false;



/*
functions and document.ready
-----------------------------------------------*/
// #mark -------------
// #mark document.ready
// #mark -------------
$(document).ready(function() {

	$('.btn').button();

	$('#vpn_form_single').hide();
	$('#vpn_form_two').hide();
	//$('#vpn_output').hide();
	
	//form selection behavior
	$('#vpn_form_forms .btn').on('click touchend', function() {
		var target = $(this).attr('id').replace(/^vpn_form_forms_/, '');
		
		if (target == 'single') {
			event_id = 'single';
			fillIpList('single');
			event_class = false;
		}else if (target == 'two'){
			event_id = 'two';
			fillIpList('two');
			event_class = false;
		}else if (target == 'remove'){
			event_id = 'remove';
			fillIpList('remove');
			event_class = false;
		}
		
		showForm(target, $(this), true);
	});

	//action when focusing on service impact or current state
	$( '#vpn_service_impact' ).on('focus', function() {
		addBehavior_highlightInsertPrompt($(this));
	});
	$( '#vpn_current_state' ).on('focus', function() {
		addBehavior_highlightInsertPrompt($(this));
	});
	$( '#vpn_event_description' ).on('focus', function() {
		addBehavior_highlightInsertPrompt($(this));
	});
	
	//note when contents of text fields are changed
	$('.vpn_text_field').on('change', function() {
		addBehavior_textFieldTouched($(this));
	});
	
	//action for "now" buttons
	$( '.time_insert_now' ).on('click touchend', function() {
		addBehavior_insertNowValue($(this));
	});
	
	//action to build out message subject and content as fields are filled out
	$( '.vpn_cont .form-control' ).on('change keyup', function() {
		addBehavior_updateMessage($(this));
	});
	
/*	//behavior for "work completed"
	$( '#maintenance_complete' ).on('click touchend', function() {
		addBehavior_completeWork();
	});*/

	//behavior for "submit"
	$( '#vpn_submit_single' ).on('click touchend', function() {
		vpnSubmit('single');
	});
	
	$('#vpn_submit_two').on('click touchend', function(){
		vpnSubmit('two');
	});

	$('#vpn_submit_remove').on('click touchend', function(){
		vpnSubmit('remove');
	});
	
	//behavior for updating event type
	$( '#vpn_type' ).on('change', function() {
		addBehavior_updateEventType();
	});

	//watch for button presses
	$(document).on('keyup', function(event) {
		handleKeyShortcut(event);
	});
	
	//now pay attention to the location hash
	obeyLocationHash(false);
	
	//no active form set in location hash? default to new incident form.
//	showForm('incident');
//	setupIncidentForm('new');
	
	//ask for any app popups
	getAppPopups();
	
	
	//default to new form
//	$('#vpn_form_forms_edit').click();
	
	//test stuff
//	addBehavior_selectSearchResult('166');
//	addBehavior_selectSearchResult('158');
	
//	$('#vpn_form_forms_search').click();
//	$('#vpn_search_event_id').val('127');
//	runEventSearch(false);

//	$('#vpn_form_forms_edit').click();
//	$('#vpn_class_unplanned').click();
//	$('#vpn_type').val('network');
//	checkForFullFormReveal();
//	$('#vpn_start_date').val('08/30/2014');
//	$('#vpn_start_time').val('10:00');
//	$('#vpn_end_date').val('08/31/2014');
//	$('#vpn_end_time').val('10:00');
//	$('#vpn_service_impact').val('ish got crazy');
//	$('#vpn_current_state').val('ish still crazy');
//	$( '#vpn_complete' ).click();
});

/*	 COULD BE USED FOR GENERAL ERROR CHECKING TEMPLATE?
function addBehavior_completeWork() {
	gatherFormData('edit');
	
	//check if any of the time fields need to be moved from "estimated"
	var a_time_bad_boy = false;
	var label = '';
	var time_bad_boys = {
		'start'	: false,
		'end'	: false
	};
	
	for (var bound in time_bad_boys) {
		var k = bound + '_type';
		if (form_data[k] == 'estimated') {
			time_bad_boys[bound] = true;
			a_time_bad_boy = true;
			if (label.length > 0) {
				label += ' and event ' + bound;
			} else {
				label = 'event ' + bound;
			}
		}
	}
	
	if (a_time_bad_boy) {
		var msg = 'You left the ' + label + ' set to "estimated." Continue?';
		var should_continue = confirm(msg);
		if (!should_continue) {
			return false;
		}
	}
	
	
	//check if need to update current state
	if (!text_fields_touched['vpn_current_state']) {
		var should_continue = confirm("You haven't changed the 'current state' since the page was loaded. Continue?");
		if (!should_continue) {
			return false;
		}
	}
	
	
	
	//set status to last option
	var last_option = '';
	$('#vpn_status option').each(function() {
		last_option = $(this).val();
	});
	$('#vpn_status').val(last_option);
	
	addBehavior_updateMessage($('#vpn_status'), false);
	
	if (validateForm()) {
		saveEvent(true);
	}
}*/

function vpnSubmit(factor){
	$('#vpn_output').show();
	fillOutput(factor);
}

function addBehavior_highlightInsertPrompt(elem) {
	var val = elem.val();
	if (val.indexOf('____') > -1) {
		var start = val.indexOf('____');
		var end = start + 4;
		
		elem.selectRange(start, end);
	}
}

function addBehavior_textFieldTouched(elem) {
	var id = $(elem).attr('id');
	text_fields_touched[id] = true;
}

function addBehavior_updateEventType() {
	//Set type to "systems"? Add "CORE" to groups affected, and mark that that's where it
	//came from.
	var type = $( '#vpn_type' ).val();
	
	if (type == 'systems') {
		core_from_systems = true;
		if (!bubble_tree['groups']) {
			bubble_tree['groups'] = {};
		}
		bubble_tree['groups']['CORE'] = 'CORE';
		rebuildBubbles($('#vpn_edit_groups_bubbles'));
	}
	
	//Set type to anything BUT systems? If so, ask if should remove CORE.
	else if (core_from_systems) {
		core_from_systems = false;
		if (confirm('The "CORE" group was added to this event when it was a systems outage. Remove?')) {
			delete bubble_tree['groups']['CORE'];
			rebuildBubbles($('#vpn_edit_group'));
		}
	}
}

function addBehavior_updateMessage(elem, force_fields) {
	//when triggered by update to planned/unplanned radios, force re-reading of status
	//options (race condition otherwise)
	if (elem && $(elem).hasClass('vpn_classes')) {
		checkForFullFormReveal();
	}

	var valid_form_types = [
		'edit'
	];
	
	if ($.inArray(active_form, valid_form_types) == -1) {
		return false;
	}

	//gather form data
	gatherFormData('edit');
	
	addBehavior_updateMessage_fields(elem, force_fields);
	
	//above may have changed form_data...rebuild
	gatherFormData('edit');
	
	//some button presses will not have finished propagating...insert based on
	//what was clicked
	// -- send if radio etc
	// -- will "gatherFormData_insertButton(elem)" work?
	if (elem.attr('type') && elem.attr('type') == 'radio') {
		gatherFormData_insertButton(elem);
	}

	updateMessage_subject(false);
	updateMessage_message();
}

function addBehavior_updateMessage_fields(elem, force_fields) {
	if (!addBehavior_updateMessage_fields_shouldUpdate(elem, force_fields)) {
		return false;
	}

	addBehavior_updateMessage_fields_serviceImpact(elem);
	addBehavior_updateMessage_fields_currentState(elem);
}

function addBehavior_updateMessage_fields_currentState(elem) {
	//don't if it's pinned
	if ($( '#pushpin_current_state' ).hasClass('pinned')) {
		return false;
	}

	var str = 'Network service to ';
	if (
		form_data['bubbles']
		&& form_data['bubbles']['buildings']
		&& Object.keys(form_data['bubbles']['buildings']).length > 0
	) {
		str += deriveBuildingsString();
	}
	str += ' has been interrupted due to ____';
	$( '#vpn_current_state' ).val(str);
}

function addBehavior_updateMessage_fields_serviceImpact(elem) {
	//don't if it's pinned
	if ($( '#pushpin_service_impact' ).hasClass('pinned')) {
		return false;
	}

	var str = '____ in ';
	if (
		form_data['bubbles']
		&& form_data['bubbles']['buildings']
		&& Object.keys(form_data['bubbles']['buildings']).length > 0
	) {
		str += deriveBuildingsString() + '.';
	}
	$( '#vpn_service_impact' ).val(str);
}

function addBehavior_updateMessage_fields_shouldUpdate(elem, force_fields) {
	var should = false;
	var field = false;
	if ($(elem).attr('id')) {
		field = $(elem).attr('id').replace(/^vpn_\w+?_/, '');
	}
	if (
		(field && field.match(/^buildings_/))
		|| field == 'building'
		|| force_fields
	) {
		should = true;
	}
	
	return should;
}


function checkForFullFormReveal() {
	//we'll reveal all the remaining containers once both the vpn type and class
	//have been selected.
	var vpn_class = deriveRadioVal('vpn_class');
	var vpn_type = deriveVpnType();
	
	if (maint_type && maint_class) {
		checkForFullFormReveal_execute(vpn_class);
	}
}

function checkForFullFormReveal_execute(vpn_class) {
	setupStatusOptions(vpn_class);
	setSingleFormDisplay('show');
	setupRootCause(vpn_class);
}

function deriveRadioVal(id) {
	var val = $('#' + id + ' .active input').val();
	return val;
}

function deriveVpnType() {
	var mtype = false;

	if ($('#vpn_type').val() != '[choose a type]') {
		mtype = $('#vpn_type').val();
	}

	return mtype;
}


function deriveUnitAndor(unit) {
	var andor = false;

	andor = deriveRadioVal('vpn_two_' + unit + '_andor');
	
	delete form_data[unit + '_and'];
	delete form_data[unit + '_or'];

	return andor;
}

function feedEventForm_inputs(event) {
	//most matchups are a more or less straightforward matchup from event
	//property to event property value
	for (var prop in event) {
		var dom = 'vpn_' + prop;
	
		//if there's a matching DOM element that's a contenteditable DIV, feed it
		if (
			$( '#' + dom).prop('contenteditable')
			&& $( '#' + dom).prop('contenteditable') != 'inherit'
		) {
			$( '#' + dom ).html(event[prop]);
		}
	
		//if there's a matching DOM element that's a text input, textarea, or select,
		//feed it
		else if (
			$( '#' + dom ).prop('tagName') == 'TEXTAREA'
			|| $( '#' + dom ).prop('tagName') == 'INPUT'
			|| $( '#' + dom ).prop('tagName') == 'SELECT'
		) {
			$( '#' + dom ).val(event[prop]);
		}
	
		//if there's a matching DOM element that's a radio, click it
		else if ($( '#' + dom ).hasClass('btn-group')) {
			var radio_id = dom + '_' + event[prop];
			if ($( '#' + radio_id).length > 0) {
				switch (dom) {
					case 'vpn_class':
						addBehavior_handleClass($('#' + radio_id), false);
						setRadioGroup('vpn_class', event[prop]);
						break;
				}
			}
		}
	}
	
	//the actual/estimated options for start and end time are a little more
	//complicated
	var bounds = ['start', 'end'];
	for (var i=0; i<bounds.length; i++) {
		var bound = bounds[i];
		var value = event[bound + '_time_type'];
		var target = 'vpn_' + bound + '_time_type';
		setRadioGroup(target, value);
	}
}

function gatherFormData(form) {
	form_data = {};

	var form_name = 'vpn_form_' + form;
	
	//first, just loop through the candidate inputs and grab their stuff
	$( '#' + form_name + ' .form-control' ).each(function() {
		var k = $(this).attr('id').replace(/^vpn_(two_|single_)?/, '');
		var target = 'val';
		if ($(this).prop('tagName') == 'DIV') {
			target = 'html';
		}
		
		switch (target) {
			case 'html':
				form_data[k] = $(this).html();
				break;
			
			default:
				form_data[k] = $(this).val();
				break;
		}
	});
	
	switch (form) {
		case 'single':
			gatherFormData__single();
			break;
			
		case 'two':
			gatherFormData__two();
			break;
	}
}

/*
function gatherFormData__single() {
	//need to do some work to massage the radio buttons
	form_data['class'] = deriveRadioVal('vpn_class');
	delete form_data['class_planned'];
	delete form_data['class_unplanned'];
	
	form_data['start_type'] = deriveRadioVal('vpn_start_time_type');
	form_data['end_type'] = deriveRadioVal('vpn_end_time_type');
	delete form_data['start_time_type_actual'];
	delete form_data['start_time_type_estimated'];
	delete form_data['end_time_type_actual'];
	delete form_data['end_time_type_estimated'];
	
	form_data['event_id'] = event_id;
	if (form_data['event_id'] == 'single') {
		form_data['event_id'] = false;
	}
	
	gatherFormData__parsePushpins();
}

//want to trigger form search when radio buttons pressed...problem is bootstrap radio
//buttons don't get set until click event has stopped propagating.
function gatherFormData_insertButton(elem) {
	if (elem) {
		var id = elem.attr('id');
		
		//search filters
		if (id.match(/^search_filter_(\w+)$/)) {
			var filter = RegExp.$1;
			form_data['search_type'] = filter;
		}		
		
		//unit andors
		else if (id.match(/^vpn_search_(\w+)_(and|or)$/)) {
			var unit = RegExp.$1;
			var andor = RegExp.$2;
			form_data[unit + '_andor'] = andor;
		}
		
		else if (id.match(/^vpn_(start|end)_time_type_(actual|estimated)$/)) {
			var bound = RegExp.$1;
			var val = RegExp.$2;
			
			form_data[bound + '_type'] = val;
		}
		
	}
}

function gatherFormData__two() {
	form_data['search_type'] = deriveRadioVal('search_filter_majorfilters');
	form_data['buildings_andor'] = deriveUnitAndor('buildings');
	form_data['devices_andor'] = deriveUnitAndor('devices');
	form_data['groups_andor'] = deriveUnitAndor('groups');
	
	gatherFormData__search_cleanup();	
}

function gatherFormData__search_cleanup() {
	//some of the inputs don't belong directly in the data
	for (var k in form_data) {
		if (k.match(/^search_filter_/)) {
			delete form_data[k];
		}
	}
	
	//some selects should count as null depending on the value
	var null_vals = {
		'class'		: 'planned or unplanned',
		'type'		: 'any type',
		'status'	: 'open or closed'
	}
	
	for (var k in null_vals) {
		var null_val = null_vals[k];
		if (form_data[k] == null_val) {
			form_data[k] = '';
		}
	}
}

function gatherFormData_parseBubbles(form) {
	$( '.vpn_bubble' ).each(function() {
		var selected = true;
	
		//if it's overridden
		if ($(this).hasClass('crossedout')) {
			selected = false;
		}
	
		var btype = $(this).attr('id').replace(/^vpn_\w+?_/, '').replace(/_.+?$/, '');
		var val = $(this).text().replace(/^\s+/, '').replace(/\s+$/, '');
		
		if (form == 'search' && btype == 'buildings')  {
			val = $(this).attr('id').replace(/^vpn_search_buildings_/, '');
		}
		
		if (!form_data['bubbles']) {
			form_data['bubbles'] = {};
		}
		
		if (!form_data['bubbles'][btype]) {
			form_data['bubbles'][btype] = {};
		}
		
		form_data['bubbles'][btype][val] = selected;
	});
}

function gatherFormData__parsePushpins() {
	if (!form_data['pushpins']) {
		form_data['pushpins'] = new Object();
	}

	$( '.autopushpin' ).each(function() {
		var k = $(this).attr('id').replace(/^pushpin_/, '');
		form_data['pushpins'][k] = $(this).hasClass('pinned');
	});
}

function highlightChildren(elem, toggle) {
	var bubble_type = elem.parent().parent().attr('id').replace(/^vpn_cont_/, '');
	var bubble_id = elem.attr('id');
	var device = bubble_id.replace(/^vpn_\w+_devices_/, '');
	
	var sniff = sniffBubble(bubble_id);
	
	var building_bubble_home = 'vpn_' + sniff['form'] + '_buildings_bubbles';
	var group_bubble_home = 'vpn_' + sniff['form'] + '_groups_bubbles';
	
	//first, handle buildings (which need a little magic since represented as building
	//roots)
	$('#' + building_bubble_home + ' .vpn_bubble').each(function() {
		//get the value of this bubble
		var this_bubble_id = $(this).attr('id');
		var building = this_bubble_id.replace(/^vpn_\w+_buildings_/, '');
		
		//the id derived from the building is a root; need to convert to name
		building = convertBuildingRoot(building);
		
		//assume want full opacity, unless toggling "on" for highlighting, in which case
		//only if building matches our devices (and if building is defined for this device)
		var the_opacity = '1';
		if (
			toggle == 'on'
			&&
			(
				!bubble_tree['devices'][device]['building_name']
				||
				building != bubble_tree['devices'][device]['building_name']
			)
		) {
			the_opacity = '.25';
		}
		
		$(this).css('opacity', the_opacity);
	});
	
	//now, handle groups
	$('#' + group_bubble_home + ' .vpn_bubble').each(function() {
		//get the value of this bubble
		var this_bubble_id = $(this).attr('id');
		var group = this_bubble_id.replace(/^vpn_\w+_groups_/, '');
		
		//assume want full opacity, unless toggling "on" for highlighting, in which case
		//only if group matches our device (and if groups are defined for this device)
		var the_opacity = '1';
		if (
			toggle == 'on'
			&&
			(
				!bubble_tree['devices'][device]['groups']
				||
				$.inArray(group, bubble_tree['devices'][device]['groups']) == -1
			)
		) {
			the_opacity = '.25';
		}
		
		$(this).css('opacity', the_opacity);
	});
}



function maintAutocomplete_select(event, ui) {
	var sniff = sniffBubble(event['target']['id']);
	var type = sniff['type'];
	var form = sniff['form'];

	var selected_str = ui['item']['value'];
	var selected_arr = selected_str.split('::');
	var device = selected_arr[0];
	var root = selected_arr[1];
	var groups_str = selected_arr[2];

	var make_children = true;
	if (form == 'search') {
		make_children = false;
	}

	switch (type) {
		case 'building':
			maintAutocomplete_select__building(device, root, groups_str, make_children);
			break;
	
		case 'device':
			maintAutocomplete_select__device(device, root, groups_str, make_children);
			break;
			
		case 'group':
			maintAutocomplete_select__group(device, root, groups_str, make_children);
			break;
			
		default:
			alert('no maintAutocomplete_select() behavior defined for ' + type);
			break;
	}

	//decide where the bubble is going, and then add it
	var bubble_home = '#vpn_' + form + '_' + type + 's_bubbles';
	rebuildBubbles( $( bubble_home ) );
	
	//clear out the input to receive the next value
	$( '#' + event['target']['id'] ).val('');
	
	//re-bind the behavior for the target autocomplete input. this is because we want it
	//to rebuild the list of already selected items, which only happens at the
	//time the behavior is attached.
	$( '#' + event['target']['id'] ).on('focus', addBehavior_maintAutocomplete($( '#' + event['target']['id'] )));
}

function maintAutocomplete_select__building(device, root, groups_str, make_children) {
	if (root.length > 0) {
		var name = root;
		if (building_root_lookup[root]) {
			name = building_root_lookup[root][0];
		}
	
		if (!bubble_tree['buildings']) {
			bubble_tree['buildings'] = {};
		}
	
		bubble_tree['buildings'][root] = name;
	}
}


function maintAutocomplete_select__device(device, root, groups_str, make_children) {
	var this_device_state = new Object();
	
	if (make_children) {
		if (root.length > 0) {
			this_device_state['building'] = root;
			this_device_state['building_name'] = convertBuildingRoot(root);
		}

		this_device_state['groups'] = new Array();

		if (groups_str.length > 0) {
			var groups = groups_str.split(',');
			for (var i=0; i < groups.length; i++) {
				var this_group = groups[i];
				var elem = this_device_state['groups'].length;
				this_device_state['groups'][elem] = this_group;
			}
		}
	}
		
	if (!bubble_tree['devices']) {
		bubble_tree['devices'] = {};
	}	
		
	bubble_tree['devices'][device] = this_device_state;
}

function maintAutocomplete_select__group(device, root, group, make_children) {
	if (group.length > 0) {
		if (!bubble_tree['groups']) {
			bubble_tree['groups'] = {};
		}
	
		bubble_tree['groups'][group] = group;
	}
}

function populateBuildingRootLookup() {
	building_root_lookup = jQuery.parseJSON(building_root_lookup_json);
}

//for reasons having to do with public/private properties, some event properties
//come in with a different name than we want them to have. others are simply
//stored in a different format.
function preenEvent(event) {
	//cases where we need to change the property name
	var translations = {
		'start_type'	: 'start_time_type',
		'end_type'		: 'end_time_type',
		'eventclass'	: 'class'
	};
	
	for (var oldk in translations) {
		var v = event[oldk];
		var newk = translations[oldk];
		event[newk] = v;
		delete event[oldk];
	}
	
	
	
	//datetimes need to split
	var time_bounds = ['start','end'];
	for (var i=0; i < time_bounds.length; i++) {
		var prop = time_bounds[i] + '_date';
		var val = event[prop];
		
		if (val && val.match(/^(\d{4})\-(\d{2})\-(\d{2}) (\d{2}:\d{2})/)) {
			var year = RegExp.$1;
			var mon = RegExp.$2;
			var day = RegExp.$3;
			var time = RegExp.$4;
			
			event[time_bounds[i] + '_date'] = mon + '/' + day + '/' + year;
			event[time_bounds[i] + '_time'] = time;
		}
	}
	
	
	
	//NULLs should be blank/false
	for (var k in event) {
		if (event[k] == 'NULL') {
			event[k] = '';
		}
	}
	
	return event;
}

function rebuildBubbles(elem) {
	var bubbles = {};
	
	//populate the bubbles object for each major type (device, building, group) based on
	//the bubble_tree object
	bubbles = rebuildBubbles_parse__devices(bubbles);
	bubbles = rebuildBubbles_parse__buildings(bubbles);
	bubbles = rebuildBubbles_parse__groups(bubbles);
	
	//build out HTML based on the bubbles object
	rebuildBubbles_execute(bubbles, elem);
	
	
	//attach highlight behavior (on and off) to each device bubble
	$('.vpn_devices_bubbles .vpn_bubble').each(function() {
		$(this).on('mouseenter', function() {
			highlightChildren($(this), 'on');
		});
		
		$(this).on('mouseleave', function() {
			highlightChildren($(this), 'off');
		});
	});
	
	//attach override behavior to each bubble no matter what type
	$('.vpn_bubble').each(function() {
		$(this).off('click');
	
		$(this).on('click', function() {
			toggleBubbleOverride($(this));
		});
	});
	
	//is this the search form? run the search.
	var sniff = sniffBubble(elem.attr('id'));
	var form = sniff['form'];
	if (form == 'search') {
		addBehavior_runFieldSearch(elem);
	}
}

function rebuildBubbles_execute(bubbles, elem) {
	//keep track of number of active buildings pre-change
	var pre_active_bldgs = deriveActiveBuildings();

	for (var bubble_type in bubbles) {
		var target_id_chunks = elem.attr('id').split('_');
		var target_id = 
			target_id_chunks[0]
			+ '_' + target_id_chunks[1]
			+ '_' + bubble_type
			+ '_bubbles';

		$( '#' + target_id ).empty();
	
		var these_bubbles = Object.keys(bubbles[bubble_type]);
		these_bubbles.sort();
		for (var i=0; i < these_bubbles.length; i++) {
			var this_bubble = these_bubbles[i];
			var bubble_root = this_bubble;
			
			if (bubble_type == 'buildings') {
				var bubble_arr = this_bubble.split('::');
				this_bubble = makeJsSafe(bubble_arr[0]);
				bubble_root = bubble_arr[1];
				
				if (!this_bubble) {
					this_bubble = bubble_root;
				}
				
				if (!bubble_root) {
					bubble_root = this_bubble;
				}
			}
			
			var btn_color_class = 'btn-info';
			var btn_glyph_class = 'glyphicon-remove-circle';
			var btn_addl = '';
			if (overridden_bubbles[bubble_type][this_bubble]) {
				btn_color_class = 'btn-default';
				btn_glyph_class = 'glyphicon-plus-sign';
				btn_addl = 'crossedout';
			}
			
			var bubble_id = 
				makeJsSafe(
					target_id_chunks[0]
					+ '_' + target_id_chunks[1]
					+ '_' + bubble_type
					+ '_' + bubble_root
				);
			
			var this_bubble_name = makeJsUnsafe(this_bubble);
			
			var html = 
				'<button type="button" id="' + bubble_id + '" class="vpn_bubble btn ' + btn_color_class + ' btn-xs ' + btn_addl + '">' +
					'<span class="glyphicon ' + btn_glyph_class + '"></span>' +
				' <span class="vpn_bubble_guts">' + this_bubble_name + '</span>' +
				'</button>';
			
			$( '#' + target_id ).append(html);
		}
	}
	
	var post_active_bldgs = deriveActiveBuildings();
	
	//if we changed the number of active buildings, force rebuilding of the target fields
	//like service impact
	var force_fields = false;
	if (pre_active_bldgs != post_active_bldgs) {
		force_fields = true;
	}
	
	addBehavior_updateMessage(elem, force_fields);
}

function rebuildBubbles_parse__buildings(bubbles) {
	if (bubble_tree['buildings'] && !bubbles['buildings']) {
		bubbles['buildings'] = {};
	}

	for (var str in bubble_tree['buildings']) {
		var bld_name = str;
		var bld_root = str;
	
		//may be getting a building root to convert
		if (str in bubble_tree['buildings']) {
			bld_name = convertBuildingRoot(str);
			bld_name += '::' + bld_root;
		}
		
		if (!bubbles['buildings'][bld_name]) {
			bubbles['buildings'][bld_name] = 0;
		}
		
		++bubbles['buildings'][bld_name];
	}
	
	return bubbles;
}

function rebuildBubbles_parse__devices(bubbles) {
	if (bubble_tree['devices'] && !bubbles['devices']) {
		bubbles['devices'] = {};
	}
	
	for (var device in bubble_tree['devices']) {
		//increment devices
		if (!bubbles['devices'][device]) {
			bubbles['devices'][device] = 1;
		} else {
			++bubbles['devices'][device];
		}
	
		//increment buildings
		if (bubble_tree['devices'][device]['building'] && bubble_tree['devices'][device]['building'].length > 0) {
			if (!bubbles['buildings']) {
				bubbles['buildings'] = {};
			}
			
			var building_root = bubble_tree['devices'][device]['building'];
			var building_name = convertBuildingRoot(building_root);
			
			//99999 is code for "unknown building"
			if (building_name == '99999' || building_root == '99999') {
				continue;
			}
			
			if (!bubbles['buildings'][building_name + '::' + building_root]) {
				bubbles['buildings'][building_name + '::' + building_root] = 1;
			} else {
				++bubbles['buildings'][building_name + '::' + building_root];
			}
		}
		
		//increment groups
		if (bubble_tree['devices'][device]['groups']) {
			if (!bubbles['groups']) {
				bubbles['groups'] = {};
			}
		
			for (var i=0; i < bubble_tree['devices'][device]['groups'].length; i++) {
				var this_group = bubble_tree['devices'][device]['groups'][i];
				if (!bubbles['groups'][this_group]) {
					bubbles['groups'][this_group] = 1;
				} else {
					++bubbles['groups'][this_group];
				}
			}
		}
	}
	
	return bubbles;
}

function rebuildBubbles_parse__groups(bubbles) {
	if (bubble_tree['groups'] && !bubbles['groups']) {
		bubbles['groups'] = {};
	}

	for (var gid in bubble_tree['groups']) {
		++bubbles['groups'][gid];
	}
	
	return bubbles;
}

function resetBubbles(form_type) {
	$( '.vpn_bubbles' ).empty();	
}

function resetSingleForm() {
	resetVars('nuke');
	
	//reset bubbles
	resetBubbles('single');

	//reset INPUTs, DIVs
	$( '#vpn_form_single .form-control' ).each(function() {
		//radios
		if ($(this).parent().parent().hasClass('btn-group')) {
			resetSingleForm__radio($(this));
		}
		
		//inputs
		else if ($(this).prop('tagName') == 'INPUT') {
			resetSingleForm__text($(this));
		}
		
		//selects
		else if ($(this).prop('tagName') == 'SELECT') {
			resetSingleForm__select($(this));
		}
		
		//textareas
		else if ($(this).prop('tagName') == 'TEXTAREA') {
			resetSingleForm__text($(this));
		}
		
		//editable divs
		else if ($(this).prop('tagName') == 'DIV') {
			resetSingleForm__html($(this));
		}
	});

	//reveal and reset event class
	$('#vpn_class').show();
	$('.vpn_classes').each(function() {
		$(this).prop('checked', false);
		$(this).parent().removeClass("active");
	});
	
	
}*/

function resetSingleForm__html(elem) {
	elem.html('');
}

function resetSingleForm__radio(elem) {
	elem.prop('checked', false);
	elem.parent().removeClass("active");
}

function resetSingleForm__select(elem) {
	var id = elem.attr('id');
	var options = $( '#' + id + ' option');
	var first_option = options[0];
	var first_option_val = $( first_option ).val();
	elem.val(first_option_val);
}

function resetSingleForm__text(elem) {
	elem.val('');
}

function resetVars(nuke) {
	active_form = false;
	active_form_type = false;
	ajax_request = false;
	bubble_tree = {};
	core_from_systems = false;
	event_class = false;
	event_id = false;
	text_fields_touched = {};
	form_data = {};
	overridden_bubbles = {
		'buildings'	: {},
		'name'	: {},
		'groups'	: {}
	};
	modal_options = {};
	pause_search = false;
	search_results = false;
}
/*
function runEventSearch(elem) {
	if (pause_search) {
		return false;
	}

	gatherFormData('search');
	gatherFormData_insertButton(elem);
	
	var form_data_json = Object.toJSON(form_data);
	
	revealPopup('waiting', false);

	ajax_req = $.ajax({
		type		: 'Post',
		url			: 'vpn_ajax.php',
		data		: 'ajax_function=findEvents'
					+ '&form_data_json=' + form_data_json,
		cache		: false,
	
		success:	function(return_val) {
			runEventSearch_cb(return_val);
		}
	});
}

function runEventSearch_build(event) {
	var html = "		<div class='panel panel-primary vpn_search_result' id='search_result_" + event.id + "'>\n";
	html += "			<div class='panel-heading row'>\n";
	html += "				<div class='col-xs-10'><h3 class='panel-title'>" + runEventSearch_build_heading(event) + "</h3></div>\n";
	html += "				<div class='col-xs-2'><span id='search_select_" + event.id + "' class='glyphicon glyphicon-share-alt vpn_search_select'></span></div>\n";
	html += "			</div>\n";
	html += "			<div class='panel-body'>\n";
	
	html += runEventSearch_build_editlog(event);
	html += runEventSearch_build_unitsAffected(event);
	html += runEventSearch_build_fields(event);
	html += runEventSearch_build_message(event);
	html += "			</div>\n";
	html += "		</div>\n";
	
	$('#vpn_form_search_results').append(html);
	hidePopups(false, true);
}

function runEventSearch_build_editlog(event) {
	html = '';
	
	//first the add event
	if (event['edit_log']['add']) {
		var add = event['edit_log']['add'][0];
		html =
			"<p class='editlog_event editlog_add'>added by " 
			+ add['changed_by_name']
			+ " on " + add['date'] + "\n</p>";
	}
	
	//the last modify event
	if (event['edit_log']['modify'] && event['edit_log']['modify'].length) {
		var mods = event['edit_log']['modify'];
		var last_mod = mods[mods.length - 1];
		html +=
			"<p class='editlog_event editlog_mod'>last modified by " 
			+ last_mod['changed_by_name']
			+ " on " + last_mod['date'] + "\n</p>";
	}
	
	//the last mailing event
	if (event['edit_log']['mailings'] && event['edit_log']['mailings'].length) {
		var mailings = event['edit_log']['mailings'];
		var last_mailing = mailings[mailings.length - 1];
		html +=
			"<p class='editlog_event editlog_mod'>last mailed by " 
			+ last_mailing['sent_by_name']
			+ " on " + last_mailing['date'] + "\n"
			+ "</p>\n"
			+ "<p class='editlog_mailing_details'>\n"
			+ "<span class='glyphicon glyphicon-envelope'></span>\n"
			+ "</p>\n"
	}
	
	return html;
}

function runEventSearch_build_fields(event) {
	html = '';

	var fields = ['service_impact','current_state','event_description','root_cause'];
	for (var i=0; i < fields.length; i++) {
		var field = fields[i];
		
		if (event[field] && event[field].length > 0 && event[field] != 'NULL') {
			var field_name = field.replace(/_/, ' ');
		
			html +=
				"				<p class='event_field'><b>"
				+ field_name + "</b>: "
				+ event[field]
				+ "</p>\n";
		}
	}
		
	return html;
}

function runEventSearch_build_heading(event) {
	html = '';
	
	html = event.eventclass + " event #" + event['id'] + ": ";
	
	if (event.status && event.status != 'NULL') {
		html += event.status + " ";
	} else {
		html += "(no status chosen) ";
	}
	
	if (event.type && event.type != 'NULL' && event.type != '[choose a type]') {
		html += event.type + " ";
	} else {
		html += "(no type chosen) ";
	}
	
	html += "alert starting ";
	
	if (event.start_date && event.start_date != 'NULL' && event.start_date != '1969-12-31 19:00:00') {
		html += event.start_date;
	} else {
		html += "(no start date chosen) ";
	}
	
	return html;
}

function runEventSearch_build_message(event) {
	html = '';

	html += "<div class='message'>\n";
	html += "<p class='message_subject'><span class='message_heading'>subject:</span><br />" + event['message_subject'] + "</p>\n";
	html += "<p class='message_contents'><span class='message_heading'>message:</span><br />" + event['message_contents'] + "</p>\n";
	html += "</div>\n";
	
	return html;
}

function runEventSearch_build_unitsAffected(event) {
	html = '';

	var units = ['devices','buildings','groups'];
	for (var i=0; i < units.length; i++) {
		var unit = units[i];
		
		var active_units = new Array();
		for (var this_unit in event['units_affected'][unit]) {
			//only continue if this set of affected units is populated; empty ones can 
			//appear as function where each element is a method...so need to skip those as
			//well
			if (
				event['units_affected'][unit][this_unit]
				&& typeof event['units_affected'][unit][this_unit] != 'function'
			) {
				var affected_val = this_unit;
				if (unit == 'buildings') {
					affected_val = convertBuildingRoot(affected_val);
				}
				
				if (affected_val.length > 0) {
					active_units[active_units.length] = affected_val;
				}
			}
		}
		
		if (active_units.length > 0) {
			html +=
				"				<p class='units_affected'><b>"
				+ unit + " affected</b>: "
				+ active_units.join(', ')
				+ "</p>\n";
		}
	}
	
	return html;
}

function runEventSearch_cb(return_val) {
	$( '#vpn_form_search_results' ).empty();
	
	if (!checkErrors(return_val)) {
		return false;
	}
	return_val = return_val.replace(/^\s*\w+::/, '');

	var events = jQuery.parseJSON(return_val);
	
	$('#vpn_form_search_results').empty();
	
	if (events.length == 0) {
		$('#vpn_form_search_results').html("<p class='search_message'>No results found.</p>");
		hidePopups(false, true);
	}
	
	else {
		for (var i=0; i<events.length; i++) {
			var event = events[i];
			runEventSearch_build(event);
		}
		
		//attach selection behavior based on type of device
		// -- touch device clicks on select arrow
		// -- everyone else anywhere on div
		$('.vpn_search_result').off();
		$('.vpn_search_select').off();
		switch (is_touch_device()) {
			case true:
				$('.vpn_search_select').on('click touchend', function(event) {
					event.stopPropagation();
					addBehavior_selectSearchResult($(this).parent().parent().parent());
				
					return false;
				});
			
				//internet explorer reports itself as a touch device. I'm not
				//gonna fight it.
				$('.vpn_search_select').show();	
				break;
			
			case false:
				$('.vpn_search_result').on('click touchend', function(event) {
					addBehavior_selectSearchResult($(this));
					return false;
				});
				break;
		}
		
		//attach mail details behavior
		$( '.editlog_mailing_details' ).each(function() {
			addBehavior_getMailDetails($(this));
		});
	}
}*/

function sanitizeFormData() {
	var target_keys = [
		'service_impact',
		'current_state',
		'event_description',
		'root_cause',
		'message_subject',
		'message_contents'
	];
	
	for (var i=0; i < target_keys.length; i++) {
		var key = target_keys[i];
		var val = form_data[key];
		
		var safe_val = encodeURIComponent(
			val
				.replace(/"/g, '&quot;')
				.replace(/'/g, '&#39;')
				.replace(/\\/g, '&#92;')
				.replace(/(?:\r\n|\r|\n)/g, '&#10;')
		);
		form_data[key] = safe_val;
	}
}
/*
function saveEvent(announce) {
	gatherFormData('single');

	var ok = saveEvent_prevalidate();
	if (!ok) {
		return false;
	}

	revealPopup('waiting', false);

	sanitizeFormData();
	
	form_data_json = Object.toJSON(form_data);

	ajax_req = $.ajax({
		type		: 'Post',
		url			: 'vpntunnels_ajax.php',
		data		: 'ajax_function=saveEvent'
					+ '&announce=' + announce
					+ '&form_data_json=' + form_data_json,
		cache		: false,
		
		success:	function(return_val) {
			saveEvent_cb(return_val);
		}
	});
}

function saveEvent_prevalidate() {
	var class_ok = saveEvent_prevalidate_class();
	var dates_ok = saveEvent_prevalidate_dates();
	
	return class_ok && dates_ok;
}

function saveEvent_prevalidate_class() {
	if (!form_data['class']) {
		alert("You cannot save without selecting planned/unplanned.");
		return false;
	}
	
	return true;
}

function saveEvent_prevalidate_dates() {
	if (form_data['start_date'] && form_data['end_date']) {

		//derive times (assuming midnight)
		start_time = form_data['start_time'];
		end_time = form_data['end_time'];
	
		if (!start_time) {
			start_time = '00:00';
		}
		
		if (!end_time) {
			end_time = '00:00';
		}
	
	
		//convert dates to timestamps
		var start_date_segs = form_data['start_date'].split('/');
		var end_date_segs = form_data['end_date'].split('/');
		var start_time_segs = start_time.split(':');
		var end_time_segs = end_time.split(':');
		
		if (!start_time_segs[2]) {
			start_time_segs[2] = '00';
		}
		
		if (!end_time_segs[2]) {
			end_time_segs[2] = '00';
		}
		
		var start_stamp = new Date(
			start_date_segs[2],
			start_date_segs[0] - 1,
			start_date_segs[1],
			start_time_segs[0],
			start_time_segs[1],
			start_time_segs[2]
		).getTime();
		
		var end_stamp = new Date(
			end_date_segs[2],
			end_date_segs[0] - 1,
			end_date_segs[1],
			end_time_segs[0],
			end_time_segs[1],
			end_time_segs[2]
		).getTime();
		
		
		if (end_stamp < start_stamp) {
			alert("You cannot save this alert because the end date you provided is before the start date.");
			return false;
		}
	}
	
	return true;
}

function saveEvent_results_addErrors(errors) {
	var msg = '';
	
	if (errors && errors.length) {
		msg += "\nThere were the following errors:\n";
		
		msg += " * ";
		msg += errors.join("\n * ");
		msg += "\n";
	}
	
	return msg;
}

function saveEvent_cb(return_val) {
	if (!checkErrors(return_val)) {
		return false;
	}
	return_val = return_val.replace(/^\s*\w+::/, '');

	var results = jQuery.parseJSON(return_val);

	//if we created a new one, reload as new 
	if (!form_data['event_id']) {
		hidePopups(false, true);
		msg = saveEvent_results(results, false);
		msg = msg.replace(/\<\/?p\>/g, '');
		msg += " Click 'ok' to reload.";
		alert(msg);
		saveEvent_rebuild(results);
	}
	
	//otherwise just give a message
	else {
		saveEvent_results(results, true);
	}
}

function saveEvent_rebuild(results) {
	hidePopups(false, true);
	var new_id = results['new_id'];
	addBehavior_selectSearchResult(new_id);	
}

function saveEvent_results(results, handlemsg) {
	var msg = '<p>Done.</p>';

	//message
	if (results['announced']) {
		msg = saveEvent_results_saveAndAnnounce(results);
	}
	
	else {
		msg = saveEvent_results_save(results);
	}
	
	if (handlemsg) {
		$( '#popup_save_results .modal-body' ).html(msg);
		hidePopups(false, true);
		revealPopup('save_results', true);
	}
	
	else {
		return msg;
	}
}

function saveEvent_results_save(results) {
	var msg = "<p>This vpn event has been saved.</p>";
	
	if (!results['save_success']) {
		msg = "<p>There was an error saving this vpn event.</p>";
		msg += saveEvent_results_addErrors(results['errors']);
	}
	
	return msg;
}

function saveEvent_results_saveAndAnnounce(results) {
	var msg = "<p>This vpn event has been saved and sent.</p>";
	
	if (!results['save_success']) {
		msg = "<p>There was an error saving this vpn event. As a result, it was not sent.</p>";
		msg += saveEvent_results_addErrors(results['errors']);
	}
	
	else if (!results['announce_success']) {
		msg = "<p>There was an error sending this vpn event.</p>";
		msg += saveEvent_results_addErrors(results['errors']);
	}
	
	return msg;
}

function searchFields_hide() {
	$( '#search_filter_fields' ).hide();
}

function searchFields_show() {
	$( '#search_filter_fields' ).show();
}

function selectSearchResult_cb(return_val) {
	if (!checkErrors(return_val)) {
		return false;
	}
	return_val = return_val.replace(/^\s*\w+::/, '');

	resetVars('nuke');

	var event = jQuery.parseJSON(return_val);
	
	event = preenEvent(event);
	
	event_id = event.id;
	event_class = event.class;
	
	//unselect the action selector up top
	//$('.vpn_form_form').prop('checked', false);
	$('.vpn_form_form').each(function() {
		$(this).prop('checked', false);
		$(this).parent().removeClass("active");
	});
	
	//reveal the incident form
	showForm('edit', false, true);
	
	//open up the fields hidden for a new request
	checkForFullFormReveal_execute(event.class);
	
	setupStatusOptions(event.class)
	
	//feed the selected event into the form
	feedEventForm(event);
	
	window.scrollTo(0,0);
	
	hidePopups(false, true);
	
	updateLocHash('select', {'event_id':event_id});
}*/

function setSingleFormDisplay(direction) {
	switch (direction) {
		case 'hide':
			setSingleFormDisplay__hide();
			break;
		
		case 'show':
			setSingleFormDisplay__show();
			break;
	}
}

function setSingleFormDisplay__hide() {
	$('.vpn_cont').each(function() {
		var display = 'none';
		if ($(this).hasClass('adam_div')) {
			display = 'block';
		}
		
		$(this).css('display', display);
	});
	$( '#vpn_message_cont' ).hide();
}

function setSingleFormDisplay__show() {
	$('.vpn_cont').each(function() {
		var display = 'block';
		$(this).css('display', display);
	});
	$( '#vpn_message_cont' ).show();
}

function setupSingleForm() {
	var label_text = 'create new vpn alert';
	var inst_text = "First, select whether it's planned or unplanned, <br /> and what type of vpn is being carried out.";
	inst_text = '';
	
	setupSingleForm__single();
	fillIpList('single');

	$( '#vpn_form_edit_label' ).html(label_text);
	$( '#vpn_form_edit_instructions' ).html(inst_text);
}

function setupSingleForm__single() {
	$('#unplanned_unknown_msg').hide();
	$('#vpn_form_mailing_details').hide();
	resetSingleForm();

/*
	//hide everything but the adam_div
	setIncidentFormDisplay('hide');
	
	//add a behavior to the class and type inputs that checks that both have been set.
	//once they have been, reveal all the containers.
	$( '.required_for_reveal' ).each(function() {
		$(this).on('change', function() {
			checkForFullFormReveal();
		});
	});
*/
}

function resetTwoForm() {
	resetVars('nuke');
	
	//reset bubbles
	resetBubbles('single');

	//reset INPUTs, DIVs
	$( '#vpn_form_two .form-control' ).each(function() {
		//radios
		if ($(this).parent().parent().hasClass('btn-group')) {
			resetTwoForm__radio($(this));
		}
		
		//inputs
		else if ($(this).prop('tagName') == 'INPUT') {
			resetTwoForm__text($(this));
		}
		
		//selects
		else if ($(this).prop('tagName') == 'SELECT') {
			resetTwoForm__select($(this));
		}
		
		//textareas
		else if ($(this).prop('tagName') == 'TEXTAREA') {
			resetTwoForm__text($(this));
		}
		
		//editable divs
		else if ($(this).prop('tagName') == 'DIV') {
			resetTwoForm__html($(this));
		}
	});

	//reveal and reset event class
	$('#vpn_class').show();
	$('.vpn_classes').each(function() {
		$(this).prop('checked', false);
		$(this).parent().removeClass("active");
	});
	
	
}

function resetTwoForm__html(elem) {
	elem.html('');
}

function resetTwoForm__radio(elem) {
	elem.prop('checked', false);
	elem.parent().removeClass("active");
}

function resetTwoForm__select(elem) {
	var id = elem.attr('id');
	var options = $( '#' + id + ' option');
	var first_option = options[0];
	var first_option_val = $( first_option ).val();
	elem.val(first_option_val);
}

function resetTwoForm__text(elem) {
	elem.val('');
}



function setTwoFormDisplay(direction) {
	switch (direction) {
		case 'hide':
			setTwoFormDisplay__hide();
			break;
		
		case 'show':
			setTwoFormDisplay__show();
			break;
	}
}

function setTwoFormDisplay__hide() {
	$('.vpn_cont').each(function() {
		var display = 'none';
		if ($(this).hasClass('adam_div')) {
			display = 'block';
		}
		
		$(this).css('display', display);
	});
	$( '#vpn_message_cont' ).hide();
}

function setTwoFormDisplay__show() {
	$('.vpn_cont').each(function() {
		var display = 'block';
		$(this).css('display', display);
	});
	$( '#vpn_message_cont' ).show();
}

function setupTwoForm() {
	var label_text = 'create new vpn alert';
	var inst_text = "First, select whether it's planned or unplanned, <br /> and what type of vpn is being carried out.";
	inst_text = '';
	
	setupTwoForm__two();
	fillIpList('two');

	$( '#vpn_form_edit_label' ).html(label_text);
	$( '#vpn_form_edit_instructions' ).html(inst_text);
}

function setupTwoForm__two() {
	$('#unplanned_unknown_msg').hide();
	$('#vpn_form_mailing_details').hide();
	resetTwoForm();

/*
	//hide everything but the adam_div
	setIncidentFormDisplay('hide');
	
	//add a behavior to the class and type inputs that checks that both have been set.
	//once they have been, reveal all the containers.
	$( '.required_for_reveal' ).each(function() {
		$(this).on('change', function() {
			checkForFullFormReveal();
		});
	});
*/
}

function setupRootCause(maint_class) {
	switch (maint_class) {
		case 'planned':
			$( '#vpn_cont_event_description' ).show();
			$( '#vpn_cont_current_state' ).hide();
			$( '#vpn_cont_root_cause' ).hide();
			break;
			
		case 'unplanned':
			$( '#vpn_cont_event_description' ).hide();
			$( '#vpn_cont_current_state' ).show();
			$( '#vpn_cont_root_cause' ).show();
			break;
	}
}
/*
function setupStatusOptions(maint_class) {
	var options = new Array();
	
	switch (maint_class) {
		case 'planned':
			options = ['planned', 'update', 'completed'];
			break;
			
		case 'unplanned':
			options = ['initial', 'update', 'resolved'];
			break;
	}
	
	$( '#vpn_status' ).empty();
	for (var i=0; i < options.length; i++) {
		var html = '<option>' + options[i] + "</option>\n";
		$( '#vpn_status' ).append(html);
	}
}

function sniffBubble(id) {
	var sniff = {};
	
	if (id.match(/^vpn_(\w+)_/)) {
		sniff['form'] = RegExp.$1;
	}
	
	else {
		sniff['form'] = 'edit';
	}
	
	sniff['form'] = sniff['form'].replace(/_.+$/, '');
	
	sniff['type'] = id.replace(/^vpn_\w+_/, '');
	
	return sniff;
}

function toggleBubbleOverride(elem) {
	var sniff = sniffBubble(elem.attr('id'));

	//what's the type and value for this bubble?
	var type = elem.attr('id');
	if (type.match(/^vpn_[^_]+_(.+?)_.+$/)) {
		type = RegExp.$1;
	}

	var gutses = elem.children('.vpn_bubble_guts');
	var guts = gutses[0];			//only expecting one valid child.
	var text = makeJsSafe($(guts).text());
	
	//are we turning on or off?
	var override = true;
	
	if (overridden_bubbles[type] && overridden_bubbles[type][text]) {
		override = false;
	}
	
	//update overrides object
	overridden_bubbles[type][text] = override;
	
	//if this is a device bubble on the edit form, override its children that don't also
	//descend from other devices
	if (type == 'devices' && sniff['form'] == 'edit') {
		toggleBubbleOverride_children(text, override);
	}
	
	rebuildBubbles(elem);
}

function toggleBubbleOverride_children(device, override) {
	toggleBubbleOverride_children__buildings(device, override);
	toggleBubbleOverride_children__groups(device, override);

	var groups = bubble_tree['devices'][device]['groups'];
}

function toggleBubbleOverride_children__buildings(device, override) {
	if (!bubble_tree['devices'][device]['building']) {
		return false;
	}

	//first, get building of this device
	var building = bubble_tree['devices'][device]['building'];
	var building_name = convertBuildingRoot(building);
	
	var act_on_building = true;
	var all_fellow_parents_inactive = true;
	
	//is the building the child of another device? if so, won't be acting on it.
	for (var this_device in bubble_tree['devices']) {
		if (this_device != device) {
			if (bubble_tree['devices'][this_device]['building'] == building) {
				act_on_building = false;
				
				if (!overridden_bubbles['devices'][this_device]) {
					all_fellow_parents_inactive = false;
				}
			}
		}
	}
	
	//if we would normally be skipping the bubble because another parent owns it, BUT all
	//fellow parents are also inactive, do act on it.
	if (!act_on_building && all_fellow_parents_inactive) {
		act_on_building = true;
	}
	
	//if we're acting on the building, run the override.
	if (act_on_building) {
		overridden_bubbles['buildings'][building_name] = override;
	}
	
	//When a a building is added/overidden as a result of parent behavior, won't trigger
	//rebuilding of certain fields. So we call it explicitly here.
	addBehavior_updateMessage_fields($('#vpn_edit_building'));
}

function toggleBubbleOverride_children__groups(device, override) {
	if (!bubble_tree['devices'][device]['groups']) {
		return false;
	}

	//first, get group of this device
	var groups = bubble_tree['devices'][device]['groups'];
	
	//is the group the child of another device? if so, won't be acting on it.
	for (var i=0; i < groups.length; i++) {
		var group_name = groups[i];
		var act_on_group = true;
		var all_fellow_parents_inactive = true;
	

		for (var this_device in bubble_tree['devices']) {
			if (this_device != device) {
				for (var j=0; j < bubble_tree['devices'][this_device]['groups'].length; j++) {
					var this_group = bubble_tree['devices'][this_device]['groups'][j];
					if (group_name == this_group) {
						act_on_group = false;
						
						if (!overridden_bubbles['devices'][this_device]) {
							all_fellow_parents_inactive = false;
						}
					}
				}
			}
		}
		
		//if we would normally be skipping the bubble because another parent owns it, BUT
		//all fellow parents are also inactive, do act on it.
		if (!act_on_group && all_fellow_parents_inactive) {
			act_on_group = true;
		}
		
		//if we're acting on the group, run the override.
		if (act_on_group) {
			overridden_bubbles['groups'][group_name] = override;
		}
	}
}*/

// some form elements are not always available; read these in flexibly
function updateMessage_addTransientKeys(msg_keys) {
	var msg_section = '';
	
	var transient_keys = {
		'current_state'		: 'Current State',
		'root_cause'		: 'Root Cause',
		'event_description'	: 'Event Description'
	};
	for (var this_key in transient_keys) {
		var key_desc = transient_keys[this_key];
		
		if (msg_keys[this_key].length > 0) {
			msg_section += "<br />\n" + "<b>" + key_desc + ":</b> " + msg_keys[this_key] + "<br />\n";
		}	
	}
	
	return msg_section;
}

function updateMessage_deriveKeys() {
	var msg_keys = {};

	msg_keys['start'] = '';
	msg_keys['end'] = '';
	msg_keys['impact'] = '';
	msg_keys['current_state'] = '';
	msg_keys['event_description'] = '';
	msg_keys['root_cause'] = '';
	
	if (form_data['start_date'] && form_data['start_time'])  {
		msg_keys['start'] = formatEventDate(form_data['start_date'], form_data['start_time'], 'start');
	}
	
	if (form_data['end_date'] && form_data['end_time'])  {
		msg_keys['end'] = formatEventDate(form_data['end_date'], form_data['end_time'], 'end');
	}
	
	else if (form_data['end_date'] == 'unknown') {
		msg_keys['end'] = form_data['end_date'];
	}
	
	if (form_data['service_impact']) {
		msg_keys['impact'] = form_data['service_impact'];
	}
	
	if (form_data['current_state'] && form_data['class'] == 'unplanned') {
		msg_keys['current_state'] = form_data['current_state'];
	}
	
	if (form_data['root_cause'] && form_data['class'] == 'unplanned') {
		msg_keys['root_cause'] = form_data['root_cause'];
	}
	
	if (form_data['event_description'] && form_data['class'] == 'planned') {
		msg_keys['event_description'] = form_data['event_description'];
	}
	
	return msg_keys;
}

function updateMessage_message() {
	//don't if it's pinned
	if ($( '#pushpin_message_contents' ).hasClass('pinned')) {
		return false;
	}
	
	var msg_keys = updateMessage_deriveKeys();
	
	var msg = 
		"<b>Start Time:</b> " + msg_keys['start'] + "<br />\n" +
		"<b>End Time:</b> " + msg_keys['end'] + "<br />\n" +
		"<br />\n" +
		"<b>Service Impact:</b> " + msg_keys['impact'] + "<br />\n";		
	
	msg += updateMessage_addTransientKeys(msg_keys);
	
	msg += "<br />\n" + "This message is sent from a non-reply email system.  Please do not respond to this email.  If you have questions or concerns about this notification, please contact <a href='mailto:ithelp@harvard.edu'>ithelp@harvard.edu</a>, 617-495-7777.";
	
	$( '#vpn_message_contents' ).html(msg);
}

function updateMessage_subject(list_mult_buildings) {
	//don't if it's pinned
	if ($( '#pushpin_message_subject' ).hasClass('pinned')) {
		return false;
	}

	var status = '';
	var eventtype = '';
	var buildings_str = '';
	
	if (form_data['status']) {
		status = form_data['status'].toUpperCase();
	}
	
	if (form_data['type']) {
		eventtype = form_data['type'].toUpperCase();
	}
	
	if (form_data['bubbles'] && form_data['bubbles']['buildings']) {
		var active_buildings = [];
		for (var bldg in form_data['bubbles']['buildings']) {
			if (form_data['bubbles']['buildings'][bldg]) {
				active_buildings[active_buildings.length] = bldg;
			}
		}
	
		if (list_mult_buildings || active_buildings.length == 1) {
			buildings_str = active_buildings.join(', ');
		}
		
		else if (active_buildings.length == 0) {
			buildings_str = '';
		}
		
		else {
			buildings_str = 'multiple buildings';
		}
	}
	
	

	var subject =
		'**' + status + '** NETWORK SERVICE INTERRUPTION NOTICE ' +
		'((' + eventtype + ')) [__eventid__]' +
		' // for ' + buildings_str;
	
	$( '#vpn_message_subject' ).val(subject);
}

function validateForm() {
	var errors = [];

	gatherFormData('edit');
	
	errors = validateForm_hasOneClass(errors);
	errors = validateForm_hasOneType(errors);
	errors = validateForm_hasOneBuilding(errors);
	errors = validateForm_hasOneGroup(errors);
	errors = validateForm_dateIsGood('start', errors);
	errors = validateForm_timeIsGood('start', errors);
	errors = validateForm_dateIsGood('end', errors);
	errors = validateForm_timeIsGood('end', errors);
	
	errors = validateForm_hasGenericText('service_impact', errors);
	
	switch (form_data['class']) {
		case 'planned':
			errors = validateForm_hasGenericText('event_description', errors);
			errors = validateForm_promptReplaced('service_impact', errors);
			errors = validateForm_promptReplaced('event_description', errors);
			break;
			
		case 'unplanned':
			errors = validateForm_hasGenericText('current_state', errors);
			errors = validateForm_promptReplaced('service_impact', errors);
			errors = validateForm_promptReplaced('current_state', errors);
			
			//if resolved, root cause?
			if (form_data['status'] == 'resolved') {
				errors = validateForm_hasGenericText('root_cause', errors);
			}
			break;
	}
	
	
	
	//errors? alert and return false.
	if (errors.length > 0) {
		var msg = "This alert can't be sent for the following reasons:\n\n * ";
		msg += errors.join("\n * ");
		alert(msg);
		return false;
	}
	
	
	//subject? (not there, and no other errors...ask if wants to try generating)
	var subj_ok = validateForm_checkMessageSegments('message_subject');
	
	//message? (not there, and no other errors...ask if wants to try generating)
	var msg_ok = validateForm_checkMessageSegments('message_contents');
	
	return subj_ok & msg_ok;
}

function validateForm_checkMessageSegments(seg) {
	if (
		!form_data[seg]
		|| form_data[seg].length < 0
		|| form_data[seg].match(/^\s*\<.+?\>\s*$/)
	) {
		var msg = 'It looks like the ' + seg + ' got cleared out. Shall I try rebuilding it?';
		if (confirm(msg)) {
			switch (seg) {
				case 'message_subject':
					updateMessage_subject(false);
					break;
				
				case 'message_contents':
					updateMessage_message();
					break;
			}
			
			return true;
		}
		
		else {
			alert("You'll have to enter a " + seg + " before you can continue.");
			return false;
		}
	}
	
	return true;
}
/*
function validateForm_dateIsGood(boundary, errors) {
	var phrase = 'a ' + boundary + ' date';
	if (boundary == 'end') {
		phrase = 'an ' + boundary + ' date';
	}

	//can skip a "bad" date under certain circumstances
	if (canSkipDateTimeTest(boundary)) {
		return errors;
	}

	var target_date = form_data[boundary + '_date'];
	if (!target_date.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
		errors[errors.length] = 'you must enter ' + phrase + ' in the format mm/dd/yyyy.';
	}
	
	return errors;
}*/

function validateForm_hasGenericText(input, errors) {
	if (!form_data[input] || form_data[input].length < 1) {
		var desc = input.replace(/_/, ' ');
		var article = 'a';
		var first_letter = desc.substring(0, 1);
		var vowels = ['a','e','i','o','u'];
		if ($.inArray(first_letter.toLowerCase(), vowels) > -1) {
			article = 'an';
		}
		var phrase = article + ' ' + desc;
		
		errors[errors.length] = 'you must provide ' + phrase + '.';
	}
	
	return errors;
}
/*
function validateForm_hasOneBuilding(errors) {
	var has_one_building = false;
	if (form_data['bubbles'] && form_data['bubbles']['buildings']) {
		for (var bld_name in form_data['bubbles']['buildings']) {
			if (form_data['bubbles']['buildings'][bld_name]) {
				has_one_building = true;
			}
		}
	}

	if (
		!form_data['bubbles']
		|| !form_data['bubbles']['buildings']
		|| !has_one_building
	) {
		//can skip if is CORE
		if (!form_data['bubbles'] || !form_data['bubbles']['groups'] || !form_data['bubbles']['groups']['CORE']) {
			errors[errors.length] = 'you must select at least one affected building, or make this a CORE event.';
		}
	}
	
	return errors;
}

function validateForm_hasOneClass(errors) {
	if (form_data['class'] != 'planned' && form_data['class'] != 'unplanned') {
		errors[errors.length] = 'you must select whether this is a planned or unplanned event.';
	}
	
	return errors;
}

function validateForm_hasOneGroup(errors) {
	var has_one_group = false;
	if (form_data['bubbles'] && form_data['bubbles']['groups']) {
		for (var group in form_data['bubbles']['groups']) {
			if (form_data['bubbles']['groups'][group]) {
				has_one_group = true;
			}
		}
	}

	if (!form_data['bubbles'] || !form_data['bubbles']['groups'] || !has_one_group) {
		errors[errors.length] = 'you must select at least one affected group.';
	}
	
	return errors;
}*/

function validateForm_hasOneType(errors) {
	if (!form_data['type'] || form_data['type'] == '[choose a type]') {
		errors[errors.length] = 'you must select what type of event this is (network, electrical, etc).';
	}
	
	return errors;
}

function validateForm_promptReplaced(input, errors) {
	var input_desc = input.replace(/_/, ' ');
	
	if ($( '#vpn_' + input ).val().indexOf('____') > -1) {
		errors[errors.length] = 'You did not finish filling out the text for ' + input_desc;
	}

	return errors;
}
/*
function validateForm_timeIsGood(boundary, errors) {
	//can skip a "bad" date under certain circumstances
	if (canSkipDateTimeTest(boundary)) {
		return errors;
	}

	var phrase = 'a ' + boundary + ' time';
	if (boundary == 'end') {
		phrase = 'an ' + boundary + ' time';
	}

	var target_time = form_data[boundary + '_time'];
	if (!target_time.match(/^\d{1,2}:\d{2}$/)) {
		errors[errors.length] = 'you must enter ' + phrase + ' in the 24 hour format hh:mm.';
	}
	
	return errors;
}*/

} ) ( jQuery );
