<?php
$CUSTOM_DB = true;
include('/var/www/html/newcommon/env_functions.php');
include('/var/www/html/newcommon/db_functions.php');
include("../../common.php");
include('./vpntunnels_ajax.php');
?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN"
	"http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en">
<head>
	<script>localStorage.clear(); </script>

	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>Harvard University Network Operations Center - VPN Tunnels Alerts</title>

	<!-- Latest compiled and minified CSS -->
	<link rel="stylesheet" href="/scripts/bootstrap_suite/bootstrap/css/bootstrap.min.css">

	<link rel="stylesheet" href="/scripts/bootstrap_suite/ajax/libs/normalize/3.0.2/normalize.css">

	<!-- Optional theme -->
	<link rel="stylesheet" href="/scripts/bootstrap_suite/bootstrap/css/bootstrap-theme.min.css">

	<link rel="stylesheet" href="/scripts/bootstrap_suite/ajax/libs/jqueryui/1.11.0/themes/smoothness/jquery-ui.css" />

	<link rel='StyleSheet' href="./vpntunnels.css" type="text/css" media='all' />
	
	
	
	
	<script src="/scripts/bootstrap_suite/ajax/libs/jquery/1.11.2/jquery-1.11.2.min.js" ></script>
	<script src="/scripts/bootstrap_suite/ajax/libs/jqueryui/jquery-ui-1.11.2.custom/jquery-ui.min.js"></script>


	<!-- Latest compiled and minified JavaScript -->
	<script src="/scripts/bootstrap_suite/bootstrap/js/bootstrap.min.js"></script>
	
	<script language='javascript' src='/scripts/scriptaculous/lib/prototype.js'></script>
	
	<script language='javascript'>
		<?php print buildBuildingRootLookup(); ?>
	</script>
	
	<script src="./vpntunnels.js"></script>
	
	<script language='javascript'>
		jQuery.noConflict();
	</script>
</head>

<body onClick="headerClickOff();">


<?php require_once('/var/www/html/portal/header.php') ?>
<?=printPortalHeader()?>
	
	<h1 id='vpn_banner' class='text-center'>VPN Tunnel Operations</h1>

	<div class='wrapper text-center'>
		<div class="btn-group" data-toggle="buttons" id='vpn_form_forms'>
			<a class="btn btn-default" id="vpn_form_forms_single">
				<input type="radio" class="vpn_form_form" name="vpn_form" />Create Single Factor
			</a>

			<a class="btn btn-default" id="vpn_form_forms_two">
				<input type="radio" class="vpn_form_form" name="vpn_form" />Create Two Factor
			</a>
			
			<a class="btn btn-default" id="vpn_form_forms_remove">
				<input type="radio" class="vpn_form_form" name="vpn_form" />Remove a Tunnel
			</a>
		</div>
	</div>


	<!-- VPN Forms -->

	<!-- Two Factor VPN Form -->
	<div id='vpn_form_two' class='vpn_form'>
		<form>
		<div class='vpn_cont adam_div' id='vpn_cont_class'>
			<h3 id='vpn_form_two_label'>Create New Two Factor VPN Tunnel</h3>
			<p id='vpn_form_two_instructions' class='caption'></p>
			
			<label for="vpn_type">VPN Tunnel Network</label>
			<select class="form-control required_for_reveal" id="vpn_type_two" autocomplete="off">
				<option></option>
			</select>
		</div>
		<br>
		<div class='vpn_cont form-group' id='vpn_cont_name'>
			<label for="vpn_name">VPN Tunnel Name</label>
			<input type="text" class="form-control vpn_autocomplete" id="vpn_two_name" placeholder="Enter a Name"  autocomplete="off">
		</div>
		
		<div class="col-sm-1 col-sm-offset-3">
			<button type='button' class="btn btn-default" id='vpn_submit_two'>Submit</button>
		</div>
		</form>
		<!--<div class="form-group">
			<label for="comment">Comment:</label>
			<textarea class="form-control" rows="5" id="comment_two"></textarea>
		</div>-->
	</div>

	<!-- Single Factor VPN Form -->
	<div id='vpn_form_single' class='vpn_form'>
		<form>
		<div class='vpn_cont adam_div' id='vpn_cont_class'>
			<h3 id='vpn_form_single_label'>Create New Single Factor VPN Tunnel</h3>
			<p id='vpn_form_single_instructions' class='caption'></p>
			
			<label for="vpn_type">VPN Tunnel Network</label>
			<select class="form-control required_for_reveal" id="vpn_type_single" autocomplete="off">
				<option></option>
			</select>
		</div>
		<br>
		<div class='vpn_cont form-group' id='vpn_cont_name'>
			<label for="vpn_name">VPN Tunnel Name</label>
			<input type="text" class="form-control vpn_autocomplete" id="vpn_single_name" placeholder="Enter a Name"  autocomplete="off">
		</div>

		<div class="col-sm-1 col-sm-offset-3">
			<button type='button' class="btn btn-default" id='vpn_submit_single'>Submit</button>
		</div>
		</form>
		<!--<div class="form-group">
			<label for="comment">Comment:</label>
			<textarea class="form-control" rows="5" id="comment_single"></textarea>
		</div>-->
	</div>	
	
	<!-- Remove VPN Tunnel Form -->
	<div id='vpn_form_remove' class='vpn_form'>
		<form>
		<div class='vpn_cont adam_div' id='vpn_cont_class'>
			<h3 id='vpn_form_remove_lavel'>Remove a VPN Tunnel</h3>
			
			<label for="vpn_list">VPN Tunnel Network (Type the tunnel name in the select box if you know it)</label>
			<select class="form-control required_for_reveal" id="vpn_type_remove" autocomplete="off">
				<option></option>
			</select>
		</div>
		<br>
		<div class="col-sm-1 col-sm-offset-3">
			<button type='button' class='btn btn-default' id="vpn_submit_remove">Submit</button>
		</div>
		</form>
	</div>
	
	<br>
	<br>
	<div id='vpn_output' class='vpn_form'>
		<form>
		<label for='vpn_out_label'>Copy this text:</label>
		<textarea class='form-control' rows='20' id='output'></textarea>
		</form>
	</div>
</body>
</html>
