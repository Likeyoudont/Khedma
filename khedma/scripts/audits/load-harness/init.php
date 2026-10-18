<?php
$app = require __DIR__.'/bootstrap.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
if (Illuminate\Support\Facades\DB::connection()->getDatabaseName() !== __DIR__.'/app/database/database.sqlite') throw new RuntimeException('Disposable database required');
Illuminate\Support\Facades\Artisan::call('migrate', ['--force'=>true]);
Illuminate\Support\Facades\DB::statement('PRAGMA journal_mode=WAL');
$hash = password_hash('LoadTest123!', PASSWORD_BCRYPT, ['cost'=>10]);
$rows=[];
for ($i=0;$i<1000;$i++) $rows[]=['name'=>'Load '.$i,'email'=>"load$i@example.test",'password'=>$hash,'role'=>'ba7it','city'=>'Rabat','created_at'=>now(),'updated_at'=>now()];
foreach(array_chunk($rows,100) as $chunk) Illuminate\Support\Facades\DB::table('users')->insert($chunk);
echo "Seeded 1000 disposable accounts\n";
