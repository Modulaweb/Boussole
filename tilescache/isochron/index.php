<?php
$url = str_replace('/isochron/','',$_SERVER['REQUEST_URI']);
$filepath = './cache/' . preg_replace('/[^a-z0-9\.]/i','_',$url);
if (is_file($filepath)) {
	$image = file_get_contents($filepath);
	header ('Content-type: image/png;',true,200);
	echo $image;
} else {
	$image = file_get_contents('http://boussole.mandarine34.fr:8080/opentripplanner-api-webapp/ws/tile/'.$url);
	if (strlen($image)>0) {
		file_put_contents($filepath,$image);
		header ('Content-type: image/png;',true,200);
		echo $image;
	}
} 
?>
