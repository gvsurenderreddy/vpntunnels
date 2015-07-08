<?php
require('/var/www/html/common/ldap_functions.php');


$SECOND_OCTET = array(
	'singlefactor'	=> '1',
	'twofactor'		=> '11'
);

$transaction_id = time() . '_' . rand(0, 999999);

//are we receiving an AJAX function from jquery?
$is_ajax = false;
$ajax_function = false;
$file_upload = false;
$file_download = false;

if ($_POST && $_POST['ajax_function']) {
	include("../../../pin_functions.php");
	include("../../common.php");
	$is_ajax = true;
	$ajax_function = $_POST['ajax_function'];
}

elseif ($_GET['download'] == 'true') {
	$file_download = true;
	$ajax_function = $_GET['ajax_function'];
	$_POST = $_GET;
}

elseif ($_GET && $_GET['ajax_function']) {
	include("../../../pin_functions.php");
	include("../../common.php");
	$is_ajax = true;
	$ajax_function = $_GET['ajax_function'];
}


//otherwise, we might be getting a file upload
elseif ($_FILES && count(array_keys($_FILES) > 0)) {
	include("../../../pin_functions.php");
	include("../../common.php");
	$file_upload = true;
}






//check access
$allowed = checkAccess();
if (!$allowed) {
	$msg = "Sorry, you don't have access to this application.";

	if ($is_ajax) {
		return ('ERROR::' . $msg);
	}
	
	else {
		print $msg;
		exit;
	}
}

//Gotten past security checks. if it's an AJAX call, run a function. Would be more flexible
//to build the function call dynamically, but the security of that concerns me.
if ($is_ajax OR $file_download) {
	switch ($ajax_function) {
		case 'getOutput':
			return ajax_getOutput($_POST['event_id'], $_POST['name'], $_POST['ip']);
			break;
			
		case 'getIpList':
			return ajax_getIpList($_POST['event_id']);
			break;
			
		case 'findEvents':
			return ajax_findEvents($_POST['form_data_json']);
			break;
	
		case 'getAppPopups':
			print getAppPopups();
			break;
	
		case 'getEvent':
			return ajax_getEvent($_POST['event_id']);
			break;
	
		case 'getMailingDetails':
			return ajax_getMailingDetails($_POST['event_id']);
			break;
	
		case 'vpnAutocomplete':
			return ajax_vpnAutocomplete($_GET['type'], $_GET['term'], $_GET['suppress']);
			break;
		
		case 'populateBuildingRootLookup':
			return ajax_populateBuildingRootLookup();
			break;
			
		case 'saveEvent':
			return ajax_saveEvent($_POST['form_data_json'], $_POST['announce']);
			break;
		
		default:
			print 'ERROR::An invalid ajax_function was passed (' . $ajax_function . ')';
			break;
	}
}


//if it's a file upload
elseif ($file_upload) {
	//for now, we presume we're only getting one file
	$file_key = array_keys($_FILES);
	$file_key = $file_key[0];
	
	//errors?
	if ($_FILES["$file_key"]['error'] != 0) {
		$file_errors = array( 
			0=>"There is no error, the file uploaded with success",
			1=>"The uploaded file exceeds the upload_max_filesize directive in php.ini",
			2=>"The uploaded file exceeds the MAX_FILE_SIZE directive that was specified in the HTML form",
			3=>"The uploaded file was only partially uploaded",
			4=>"No file was uploaded",
			6=>"Missing a temporary folder"
		);
		
		$err_code = $_FILES["$file_key"]['error'];
		$err_msg = $file_errors[$err_code];
	
		print 'ERROR::there was an error uploading the file (' . $err_msg . ')';
		exit;
	}
	
	//fetch the file
	$text = file_get_contents($_FILES["$file_key"]['tmp_name']);
	$text = strtolower($text);
	
	switch ($file_key) {
		default:
			print "ERROR::Sorry, no file upload behavior defined for " . $file_key;
			break;
	}
}

header ("Connection: close");

//did we just do a file download? die.
if ($file_download) {
	exit;
}



/*
functions
--------------------------------------------------- */
function ajax_getOutput($factor, $name, $ip){
	$vpn_ip = substr($ip, 0, -3);
	$network_name = strtoupper($name);
	$vpn_parts = explode(".", $vpn_ip);
	$vpn_short = substr($vpn_ip, 0, -1);

	$cli_output = '';
	if($factor == 'remove'){
		$factor = 'single';
		$network = explode(' ', $ip);
		$name = $network[0];
		$ip = $network[1];
		if(substr($ip, 0, 2) == '10'){
			$ip = substr($ip, 0, -3);
			if(substr($ip, 3, 2) == '11'){
				$factor = 'two';
			}
		}
		$vpn_parts = explode(".", $ip);
		$vpn_short = substr($vpn_ip, 0, -1);
		if($factor == 'single'){
			$cli_output = "no access-list VPN:Outside:810_nat0_outbound extended permit ip object-group " . $name . "-VPN object-group GLOBAL-NONAT\n" .
			"no access-list " . $name . "-NAT extended permit ip object-group " . $name . "-VPN any\n".
			"no nat (VPN:Outside:810,VPN:Inside:811) source static " . $name . "-VPN " . $name . "-VPN destination static GLOBAL-NONAT GLOBAL-NONAT no-proxy-arp route-lookup\n".
			"no nat (VPN:Outside:810,VPN:Inside:811) source dynamic " . $name . "-VPN obj-128.103.224." . $vpn_parts[2] . "\n".
			"no ip local pool ". $name . " " . $vpn_short . "1-" . $vpn_short . "127 mask 255.255.255.0\n".
			"no group-policy " . $name . " attributes\n".
			"no group-policy " . $name . " internal\n".
			"no object-group network " . $name . "-VPN\n".
			"-------------------------------------------------------------\n".
			"PLEASE REMEMBER:\n".
			"Notify netmanager@harvard.edu and/or systems@harvard.edu\n".
			"Cleanup ACL and Custdb";
		}elseif($factor == 'two'){
			$cli_output = "no access-list VPN:Outside:810_nat0_outbound extended permit ip object-group " . $name . "-VPN object-group GLOBAL-NONAT\n" .
			"no access-list " . $name . "-NAT extended permit ip object-group " . $name . "-VPN any\n".
			"no nat (VPN:Outside:810,VPN:Inside:811) source static " . $name . "-VPN " . $name . "-VPN destination static GLOBAL-NONAT GLOBAL-NONAT no-proxy-arp route-lookup\n".
			"no nat (VPN:Outside:810,VPN:Inside:811) source dynamic " . $name . "-VPN obj-128.103.150." . $vpn_parts[2] . "\n".
			"no ip local pool ". $name . " " . $vpn_short . "1-" . $vpn_short . "127 mask 255.255.255.0\n".
			"no group-policy " . $name . " attributes\n".
			"no group-policy " . $name . " internal\n".
			"no object-group network " . $name . "-VPN\n".
			"-------------------------------------------------------------\n".
			"PLEASE REMEMBER:\n".
			"Notify netmanager@harvard.edu and/or systems@harvard.edu\n".
			"Cleanup ACL and Custdb";
		}
	}else{
		if(nameCheck($name, $factor) == ''){
		if($factor == 'single'){
			$cli_output .= "object-group network ". $network_name. "-VPN\n".
			"network-object ". $vpn_ip. " 255.255.255.0\n\n".
			"object network obj-128.103.224.". $vpn_parts[2]. "\n".
			"host 128.103.224.". $vpn_parts[2]. "\n\n".
			"access-list VPN:Outside_810_nat0_outbound extended permit ip object-group ". $network_name. "-VPN object-group GLOBAL-NONAT\n".
			"access-list ". $network_name. "-NAT extended permit ip object-group ". $network_name. "-VPN any\n". 
			"ip local pool ". $network_name. " ". $vpn_short. "1-". $vpn_short. "127 mask 255.255.255.0\n".
			"nat (VPN:Outside:810,VPN:Inside:811) source static ". $network_name. "-VPN ". $network_name. "-VPN destination static GLOBAL-NONAT GLOBAL-NONAT no-proxy-arp route-lookup\n".
			"nat (VPN:Outside:810,VPN:Inside:811) source dynamic ". $network_name. "-VPN obj-128.103.224.". $vpn_parts[2]. "\n".
			"group-policy ". $network_name. " internal\n".
			"group-policy ". $network_name. " attributes\n".
			"address-pools value ". $network_name. "\n\n\n-----------------------------------------------------------------------------------------------------------------------------------\n\n\n".
			"object-group network ". $network_name. "-VPN\n".
			"network-object ". $vpn_ip. " 255.255.255.0\n\n".
			"object network obj-128.103.24.". $vpn_parts[2]. "\n".
			"host 128.103.24.". $vpn_parts[2]. "\n\n".
			"access-list NOC:970_nat0_outbound extended permit ip object-group ". $network_name. "-VPN object-group GLOBAL-NONAT\n". 
			"access-list ". $network_name. "-NAT extended permit ip object-group ". $network_name. "-VPN any\n".
			"ip local pool ". $network_name. " ". $vpn_short. "129-". $vpn_short. "255 mask 255.255.255.0\n".
			"nat (NOC:970,NOC:374) source static ". $network_name. "-VPN ". $network_name. "-VPN destination static GLOBAL-NONAT GLOBAL-NONAT no-proxy-arp route-lookup\n".
			"nat (NOC:970,NOC:374) source dynamic ". $network_name. "-VPN obj-128.103.24.". $vpn_parts[2]. "\n".
			"group-policy ". $network_name. " internal\n".
			"group-policy ". $network_name. " attributes\n".
			"address-pools value ". $network_name. "\n\n";
		}elseif($factor == 'two'){
			$cli_output .= "object-group network ". $network_name. "-VPN\n".
			"network-object ". $vpn_ip. " 255.255.255.0\n\n".
			"object network obj-128.103.150.". $vpn_parts[2]. "\n".
			"host 128.103.150.". $vpn_parts[2]. "\n\n".
			"access-list VPN:Outside_810_nat0_outbound extended permit ip object-group ". $network_name. "-VPN object-group GLOBAL-NONAT\n".
			"access-list ". $network_name. "-NAT extended permit ip object-group ". $network_name. "-VPN any\n". 
			"ip local pool ". $network_name. " ". $vpn_short. "1-". $vpn_short. "127 mask 255.255.255.0\n".
			"nat (VPN:Outside:810,VPN:Inside:811) source static ". $network_name. "-VPN ". $network_name. "-VPN destination static GLOBAL-NONAT GLOBAL-NONAT no-proxy-arp route-lookup\n".
			"nat (VPN:Outside:810,VPN:Inside:811) source dynamic ". $network_name. "-VPN obj-128.103.150.". $vpn_parts[2]. "\n".
			"group-policy ". $network_name. " internal\n".
			"group-policy ". $network_name. " attributes\n".
			"address-pools value ". $network_name. "\n\n\n-----------------------------------------------------------------------------------------------------------------------------------\n\n\n".
			"object-group network ". $network_name. "-VPN\n".
			"network-object ". $vpn_ip. " 255.255.255.0\n\n".
			"object network obj-128.103.15.". $vpn_parts[2]. "\n".
			"host 128.103.15.". $vpn_parts[2]. "\n\n".
			"access-list NOC:970_nat0_outbound extended permit ip object-group ". $network_name. "-VPN object-group GLOBAL-NONAT\n". 
			"access-list ". $network_name. "-NAT extended permit ip object-group ". $network_name. "-VPN any\n".
			"ip local pool ". $network_name. " ". $vpn_short. "129-". $vpn_short. "255 mask 255.255.255.0\n".
			"nat (NOC:970,NOC:374) source static ". $network_name. "-VPN ". $network_name. "-VPN destination static GLOBAL-NONAT GLOBAL-NONAT no-proxy-arp route-lookup\n".
			"nat (NOC:970,NOC:374) source dynamic ". $network_name. "-VPN obj-128.103.15.". $vpn_parts[2]. "\n".
			"group-policy ". $network_name. " internal\n".
			"group-policy ". $network_name. " attributes\n".
			"address-pools value ". $network_name. "\n\n";
		}else{
			$cli_output .= "\n\n\nERROR\n\n\n";
		}
	
	}else{
		$cli_output = nameCheck($name, $factor);
	}
	}
	
	
	echo json_encode(array($cli_output));
}

function nameCheck($name, $factor){
	$name = strtoupper($name);
	$error = '';
	$name_used_array = array();
	
	$get_name_used = array();
	$get_name_used = runQuerys('custdb', "SELECT tunnel, ip_range FROM vpn_tunnels");
	
	while($row = mysql_fetch_assoc($get_name_used)){
		$name_used[]=$row;
	}
	
	foreach($name_used as $row){
		$uname = $row['tunnel'];
		array_push($name_used_array, $uname);
	}
	
	if(in_array($name, $name_used_array)){
		$error = "NAME ALREADY IN USE";
	}elseif($name == ''){
		$error = "PLEASE ENTER A NAME";
	}else{
		if($factor == 'single'){
			$admin_check = substr($name, -5);
			if($admin_check == 'ADMIN'){
				$error = "SINGLE FACTOR SHOULD NOT HAVE 'ADMIN' AT THE END";
			}
		}elseif($factor == 'two'){
			$admin_check = substr($name, -5);
			if($admin_check != 'ADMIN'){
				$error = "NAME NEEDS 'ADMIN' AT THE END";
			}
		}
	}
	

	return $error;
}

function ajax_getIpList($factor){
	global $SECOND_OCTET;
	$ip_list = array();

	if($factor == 'single'){
		$ip_list = ipSearch($SECOND_OCTET['singlefactor']);
		echo json_encode($ip_list);
	}elseif($factor == 'two'){
		$ip_list = ipSearch($SECOND_OCTET['twofactor']);
		echo json_encode($ip_list);
	}elseif($factor == 'remove'){
		$ip_list = ipGetUsed();
		echo json_encode($ip_list);
	}
}

function ipSearch($block){

	$ip_used_array = ipGet($block);
	$ip_open_array = ipOpen($ip_used_array);
	
	return $ip_open_array;
}

function ipGetUsed(){
	$ip_used_array = array();
	
	$get_ip_used = array();
	$get_ip_used = runQuerys('custdb', "SELECT tunnel, ip_range FROM vpn_tunnels");
	while($row = mysql_fetch_assoc($get_ip_used)){
		$ip_used[]=$row;
	}
	foreach($ip_used as $row){
		$ip = $row['tunnel'] . ' ' . $row['ip_range'];
		array_push($ip_used_array, $ip);
	}
	
	return $ip_used_array;
}

function ipGet ($factor){
	$ip_used_array = array();
	
	$get_ip_used = array();
	$get_ip_used = runQuerys('custdb', "SELECT tunnel, ip_range FROM vpn_tunnels");
	while($row = mysql_fetch_assoc($get_ip_used)){
		$ip_used[]=$row;
	}
	foreach($ip_used as $row){
		$ip = $row['ip_range'];
		$ip_split = explode(".", $ip);
		if ($ip_split[1] == $factor){
			$ip_unsplit = implode(".",$ip_split);
			array_push ($ip_used_array, $ip_unsplit);
			if($ip_split[3] == '0/23'){
				$ip_split[3] = '0/24';
				$ip_split[2] += 1;
				$ip_unsplit = implode(".", $ip_split);
				array_push($ip_used_array, $ip_unsplit);
			}
		}
	}

	return $ip_used_array;
}

function ipOpen ($ip_used_array){
	$ip_open_array = array();
	$ip_used_array_short = array();
	$ip_split = explode(".", $ip_used_array[0]);
	
	foreach($ip_used_array as $value){
		$ip_short = substr($value, 0, -3);
		array_push($ip_used_array_short, $ip_short);
	}
	//keeping networks 10.xx.7 and lower open
	for($i=8;$i<=255;$i++){
		$ip_split[2]=$i;
		$ip_unsplit = implode(".", $ip_split);
		$ip_unsplit_short = substr($ip_unsplit, 0, -3);
		if(!in_array($ip_unsplit_short, $ip_used_array_short)){
			array_push($ip_open_array, $ip_unsplit);
		}
	}
	
	return($ip_open_array);
}

function ajax_vpnAutocomplete($type, $term, $suppress_json) {
	$suppress = 
		json_decode(
			html_entity_decode(
				stripslashes(
					$suppress_json
				)
			), 
		
			true
		);
		
	$data = array();
	
	switch ($type) {
		case 'building':
			$data = ajax_vpnAutocomplete__building($term, $suppress);
			break;
	
		case 'device':
			$data = ajax_vpnAutocomplete__device($term, $suppress);
			break;
			
		case 'group':
			$data = ajax_vpnAutocomplete__group($term, $suppress);
			break;
	
		default:
			print "no ajax_vpnAutocomplete() behavior defined for " . $type;
			exit;
			break;
	}
	
	
	
	$return = array();
	
	
	//feed in results from db
	foreach ($data as $label => $row) {
		$return[] = array(
			'label'	=> $label,
			'value'	=> $row['device'] . '::' . $row['bld_root'] . '::' . $row['groups']
		);
	}
	
	//now want to allow exactly what the user typed, if not represented in
	//results
	$return = ajax_vpnAutocomplete_feedArbitary($term, $type, $return);
	
	
	
	print json_encode($return);
}

function ajax_vpnAutocomplete_buildSuppressClause($suppress, $column) {
	$clause = '';
	
	if (count(array_keys($suppress)) > 0) {
		$clause = " AND " . $column . " NOT IN ('" . join("','", $suppress) . "') ";
	}
	
	return $clause;	
}

function ajax_vpnAutocomplete_feedArbitary($term, $type, $return) {
	//found a match? stop looking, and return (won't be inserting competing 
	//arbitary value)
	foreach ($return as $pair) {
		$needle = strtolower($term);
		$haystack = strtolower($pair['label']);
		if ($needle == $haystack) {
			return $return;
			break;
		}
	}
	
	$term = stripslashes($term);
	$arbitrary_chunks = array('','','');
	$arb_target = 0;
	switch ($type) {
		case 'building':
			$arb_target = 1;
			break;
	
		case 'group':
			$arb_target = 2;
			break;
	}
	$arbitrary_chunks[$arb_target] = $term;

	array_unshift($return, 
		array(
			'label'	=> '"' . $term . '"',
			'value'	=> join('::', $arbitrary_chunks)
		)
	);

	return $return;
}

function ajax_vpnAutocomplete__building($term, $suppress) {
	$buildings = array();

	$suppress = array_keys($suppress);
	$suppress_clause = ajax_vpnAutocomplete_buildSuppressClause($suppress, 'bld_root');

	$get_buildings = runQuerys('custdb',
		"SELECT
		bld_root,match_string
		FROM building_roots
		WHERE match_string like '%" . mysql_real_escape_string($term) . "%'
		" . $suppress_clause . "
		ORDER BY match_string"
	);
	
	while ($row = mysql_fetch_assoc($get_buildings)) {
		$k = $row['match_string'];
		$buildings["$k"] = $row;
	}
	
	return $buildings;
}

function ajax_vpnAutocomplete__device($term, $suppress) {
	$devices = array();

	$suppress = array_keys($suppress);
	$suppress_clause = ajax_vpnAutocomplete_buildSuppressClause($suppress, 'device');

	$devices = ajax_vpnAutocomplete__device_huis($term, $suppress, $devices);
	$devices = ajax_vpnAutocomplete__device_snmp($term, $suppress, $devices);
	
	return $devices;
}

function ajax_vpnAutocomplete__device_huis($term, $suppress, $devices) {
	//get devices from HUIS
	$get_devices = runQuerys('custdb',
		"SELECT
		device,bld_root,GROUP_CONCAT(DISTINCT(group_id) ORDER BY group_id) AS groups
		FROM interfaces
		WHERE device like '%" . mysql_real_escape_string($term) . "%'
		" . $suppress_clause . "
		GROUP BY device
		ORDER BY device"
	);
	
	while ($row = mysql_fetch_assoc($get_devices)) {
		$k = $row['device'];
		
		if ($row['bld_root'] == '99999') {
			$row['bld_root'] = '';
		}
		
		if (!$devices["$k"]) {
			$devices["$k"] = $row;
		}
	}
	
	return $devices;
}

function ajax_vpnAutocomplete__group($term, $suppress) {
	$groups = array();

	$suppress = array_keys($suppress);
	$suppress_clause = ajax_vpnAutocomplete_buildSuppressClause($suppress, 'group_id');

	$get_groups = runQuerys('custdb',
		"SELECT
		group_id,full_group_name
		FROM groups
		WHERE
			(
				group_id like '%" . mysql_real_escape_string($term) . "%'
				OR full_group_name like '%" . mysql_real_escape_string($term) . "%'
			)
			" . $suppress_clause . "
		ORDER BY group_id"
	);
	
	while ($row = mysql_fetch_assoc($get_groups)) {
		$k = $row['group_id'] . ': ' . $row['full_group_name'];
		$groups["$k"] = array('groups' => $row['group_id']);
	}
	
	return $groups;
}

function ajax_populateBuildingRootLookup() {
	$lookup = array();
	
	$get_bldgs = runQuerys('custdb', "SELECT * FROM building_roots");
	while($row = mysql_fetch_assoc($get_bldgs)) {
		$root = $row['bld_root'];
		
		$lookup["$root"][] = $row;
	}
	
	print 'OK::' . json_encode($lookup);
}

function buildAffectedObject($unit) {
	switch ($unit) {
		case 'buildings':
			return new BuildingsAffected();
			break;
	
		case 'devices':
			return new DevicesAffected();
			break;
			
		case 'groups':
			return new GroupsAffected();
			break;
	}
}

function buildBuildingRootLookup() {
	$get_bldgs = runQuerys('custdb', "SELECT * FROM building_roots GROUP BY bld_root ORDER BY match_string");
	
	$roots = array();
	
	while($row = mysql_fetch_assoc($get_bldgs)) {
		$root = $row['bld_root'];
		
		$roots["$root"][] = $row;
	}
	
	return "var building_root_lookup_json = '" . addslashes(json_encode($roots)) . "';";
}

function buildEventObject($event_data) {
	$obj_class = $event_data['class'];
	$event_id = $event_data['event_id'];
	
	//make sure a null event_id is false
	if (!$event_id) {
		$event_id = false;
	}
	
	switch ($obj_class) {
		case 'unplanned':
			$event = new UnplannedIncident($event_id);
			break;
			
		case 'planned':
			$event = new PlannedIncident($event_id);
			break;
	}
	
	return $event;
}

function checkAccess() {
	return true;
}

function deriveCriteria($form_data) {
	$criteria = array();

	//first, is search_type anything but 'search'
	if ($form_data['search_type'] && $form_data['search_type'] != 'search') {
		$criteria['preset'] = $form_data['search_type'];
		
		//if search type is 'last10itouched', add huid
		if ($form_data['search_type'] == 'last10itouched') {
			global $query;
			$criteria['preset'] = 'last10touchedby';
			$criteria['huid'] = $query['custdb']['huid'];
		}
	}
	
	else {
		$criteria = deriveCriteria_parseFields($form_data, $criteria);
		$criteria = deriveCriteria_unitBubbles($form_data, $criteria);
	}
	
	return $criteria;
}

function deriveCriteria_parseFields($form_data, $criteria) {
	$fields = array(
		'event_id',
		'class',
		'type',
		'status',
		'text',
		'start_after',
		'start_before',
		'end_after',
		'end_before'
	);
	
	foreach ($fields as $field) {
		if ($form_data["$field"] && strlen($form_data["$field"])) {
			$criteria["$field"] = $form_data["$field"];
		}
	}

	return $criteria;
}

function deriveCriteria_unitBubbles($form_data, $criteria) {
	foreach ($form_data['bubbles'] as $unit => $vals) {
		$andor = $form_data[$unit . '_andor'];
		
		$criteria_vals = array();
		foreach ($vals as $val => $on) {
			if ($on) {
				$criteria_vals[] = $val;
			}
		}
		
		$criteria[$unit . '_affected'] = array(
			'vals'	=> $criteria_vals,
			'andor'	=> $andor
		);
	}

	return $criteria;
}

function feedEventObject($event, $event_data) {
	global $query;

	//clean up html in the data
	$event_data = purifyHTML($event_data);

	//first grab all the properties that match up well
	foreach (get_object_vars($event) as $k => $v) {
		if ($event_data["$k"]) {
			$event->$k = $event_data["$k"];
		}
	}
	
	//want to append time to dates, and convert to nice format
	foreach (array('start', 'end') as $boundary) {
		$prop = $boundary . '_date';
		$event->$prop = 
			date (
				'Y-m-d G:i:s',
				strtotime($event->$prop . ' ' . $event_data[$boundary . '_time'])
			);
	}
	
	//now add devices, buildings, and groups affected
	foreach (array('devices','buildings','groups') as $unit) {
		$selections = $event_data['bubbles']["$unit"];
		$unitobj = buildAffectedObject($unit);
		$unitobj->setItems($selections);
		
		$unitprop = $unit . '_affected';
		$event->$unitprop = $unitobj;
	}
	
	//add pushpin data
	$event->pushpins = $event_data['pushpins'];
	
	//add custdb data
	$event->user_huid = $query['custdb']['huid'];
	$event->user_name = $query['custdb']['last_name'] . ', ' . $query['custdb']['first_name'];
	
	//copy over the public version of the event id
	$event->id = $event_data->id;
	
	return $event;
}

function filterEvents($events) {
	$new_events = array();

	foreach ($events as $event) {
		$new_edit_log = array();
		
		//make any NULL keys simply blank
		foreach ($event as $k => $v) {
			if (gettype($v) == 'string' && $v == 'NULL') {
				$v = '';
				$event->$k = $v;
			}
		}
		
		//pare down edit log data
		foreach ($event->edit_log as $change_type => $changes) {
			foreach ($changes as $change) {
				unset($change['old_vals']);
				unset($change['new_vals']);
				$new_edit_log["$change_type"][] = $change;
			}
		}
		
		$event->edit_log = $new_edit_log;
	
	
		
		
		//make empty units_affected entities false, or else javascript will give them
		//dummy prototype methods
		foreach ($event->units_affected as $type => $data) {
			if (count(array_keys($data)) == 0) {
				unset($event->units_affected->$type);
			}
		}
	
		if (count(array_keys($event->devices_affected->inheritance)) == 0) {
			unset($event->devices_affected->inheritance);
		}
	
	
		$new_events[] = $event;
	}

	return $new_events;
}

function purifyHTML($event_data) {
	require ('/var/www/html/portal/scripts/htmlpurifier-4.6.0/library/HTMLPurifier.auto.php');
	 $purifier = new HTMLPurifier();

	foreach ($event_data as $k => $v) {
		if (gettype($v) == 'string') {
			$event_data["$k"] = $purifier->purify($v);
		}
	}
	
	return $event_data;
}
