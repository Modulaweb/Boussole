<?php
// simple tilescache
header ('Content-type: image/png;',true,200);
//header ('HTTP/1.0 200 OK',true,200);
$url = str_replace('/cloudmade','',$_SERVER['REQUEST_URI']);
$dirs = explode('/',$url);
$file = $dirs[count($dirs)-1];
unset($dirs[count($dirs)-1]);
$path = implode('/',$dirs);
$basepath = '.';
@mkdir($basepath.$path, 0777, true);
$filepath = $basepath.$path.'/'.$file;
echo $image = file_get_contents('http://a.tile.cloudmade.com'.$url);
if (strlen($image)>0) file_put_contents($filepath,$image);
?>
