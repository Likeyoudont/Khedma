<?php
$loader = require __DIR__.'/app/vendor/autoload.php';
$loader->setPsr4('App\\', __DIR__.'/app/app');
$loader->setPsr4('Database\\Seeders\\', __DIR__.'/app/database/seeders');
$app = require __DIR__.'/app/bootstrap/app.php';
return $app;
