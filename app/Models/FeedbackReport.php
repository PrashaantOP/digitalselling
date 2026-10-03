<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;

/** Dashboard ka "Bug report / feature request". Screenshot private disk pe — sirf bhejne wala store aur admin dekhte hain. */
class FeedbackReport extends Model
{
    use HasUuid;

    protected $table = 'feedback_reports';

    public const TYPES = ['bug' => 'Bug report', 'feature' => 'Feature request'];

    public const STATUSES = ['open' => 'Open', 'in_progress' => 'In progress', 'resolved' => 'Resolved', 'closed' => 'Closed'];

    protected $fillable = ['user_id', 'creator_id', 'type', 'title', 'details', 'page_url', 'screenshot_path', 'status', 'admin_note'];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'creator_id');
    }
}
