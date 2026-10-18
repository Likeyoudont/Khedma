<?php
// Disposable loopback-only test harness; never included in application source.
if (isset($_SERVER['HTTP_X_LOAD_IP'])) $_SERVER['REMOTE_ADDR'] = $_SERVER['HTTP_X_LOAD_IP'];
$app = require __DIR__.'/bootstrap.php';
$app->handleRequest(Illuminate\Http\Request::capture());
