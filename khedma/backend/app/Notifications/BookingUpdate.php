<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class BookingUpdate extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $bookingId)
    {
        $this->afterCommit();
    }

    public function via(object $notifiable): array
    {
        return $notifiable->email ? ['mail'] : [];
    }

    public function toMail(object $notifiable): MailMessage
    {
        // Keep personal details and message contents in the authenticated app.
        return (new MailMessage)
            ->subject('Khedma — Booking update / تحديث الطلب')
            ->line('There is an update to your booking. Sign in to view the details.')
            ->line('كاين تحديث فالطلب ديالك. دخل لحسابك باش تشوف التفاصيل.')
            ->action('Open booking / شوف الطلب', rtrim(config('services.frontend_url'), '/').'/job/'.$this->bookingId);
    }
}
