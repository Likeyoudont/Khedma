<?php

namespace App\Http\Controllers;

use App\Models\SocialAccount;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PasswordRecoveryController extends Controller
{
    private function enabled(): bool
    {
        return config('services.password_recovery_enabled') && in_array(config('mail.default'), ['smtp', 'ses', 'postmark', 'resend', 'sendmail'], true);
    }

    public function options()
    {
        return response()->json(['email' => $this->enabled(), 'phone' => false]);
    }

    public function send(Request $request)
    {
        abort_unless($this->enabled(), 503, 'Email recovery is not available yet.');
        $data = $request->validate(['email' => ['required', 'email', 'max:255']]);
        $email = strtolower(trim($data['email']));
        $user = User::where('email', $email)->first();
        if ($user && ! SocialAccount::where('user_id', $user->id)->exists()) {
            Password::sendResetLink(['email' => $email]);
        }

        // The same response is returned for unknown, social and throttled accounts.
        return response()->json(['message' => 'If an eligible account exists, a reset link will be sent.']);
    }

    public function reset(Request $request)
    {
        abort_unless($this->enabled(), 503, 'Email recovery is not available yet.');
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'], 'token' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'max:128', 'confirmed'],
        ]);
        $data['email'] = strtolower(trim($data['email']));
        $user = User::where('email', $data['email'])->first();
        if (! $user || SocialAccount::where('user_id', $user->id)->exists()) {
            throw ValidationException::withMessages(['token' => 'This reset link is invalid or expired.']);
        }
        $status = Password::reset($data, function (User $account, string $password) {
            $account->password = $password;
            $account->setRememberToken(Str::random(60));
            $account->save();
            if (config('session.driver') === 'database') {
                DB::table(config('session.table', 'sessions'))->where('user_id', $account->id)->delete();
            }
            event(new PasswordReset($account));
        });
        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['token' => 'This reset link is invalid or expired.']);
        }
        if ($request->user()?->id === $user->id) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json(['message' => 'Password reset. Sign in with your new password.']);
    }
}
