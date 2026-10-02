<?php

namespace Tests\Feature;

use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/** Dashboard → Store: avatar upload wahi request bhejta hai jo screen bhejti hai (multipart + _method=put). */
class StoreAvatarTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('assets');
    }

    private function creator(string $username): User
    {
        $creator = User::factory()->createOne(['role' => 'creator', 'username' => $username]);
        Store::create(['user_id' => $creator->id, 'username' => $username, 'display_name' => 'My Store', 'is_live' => true]);

        return $creator;
    }

    private function upload(User $creator, UploadedFile $file, array $extra = [])
    {
        return $this->actingAs($creator)->post('/dashboard/store', $extra + [
            '_method' => 'put', 'avatar' => $file,
            'username' => $creator->username, 'display_name' => 'My Store',
            'bio' => '', 'header_heading' => '', 'welcome_message' => '', 'is_live' => '1',
        ]);
    }

    public function test_avatar_uploads_for_a_plain_username(): void
    {
        $creator = $this->creator('prashant');

        $this->upload($creator, UploadedFile::fake()->image('me.jpg', 500, 500))->assertSessionHasNoErrors();

        $avatar = Store::firstOrFail()->avatar;
        $this->assertStringStartsWith('images/prashant/store/', $avatar);
        Storage::disk('assets')->assertExists($avatar);
    }

    /** Registration naam se hyphen wala username banata hai — us account pe bhi Store tab save hona chahiye. */
    public function test_avatar_uploads_when_the_username_has_a_hyphen(): void
    {
        $creator = $this->creator(User::uniqueUsername('Prashant Kumar'));
        $this->assertSame('prashant-kumar', $creator->username);

        $this->upload($creator, UploadedFile::fake()->image('me.png', 400, 400))->assertSessionHasNoErrors();

        $this->assertNotNull(Store::firstOrFail()->avatar);
        $this->assertSame('prashant-kumar', $creator->fresh()->username);

        // Settings tab bhi wahi username maanta hai
        $this->actingAs($creator)->put('/dashboard/store/settings', ['username' => 'prashant-kumar', 'column_layout' => 'single'])->assertSessionHasNoErrors();
    }

    public function test_a_new_avatar_replaces_the_old_file(): void
    {
        $creator = $this->creator('prashant');

        $this->upload($creator, UploadedFile::fake()->image('one.jpg'));
        $old = Store::firstOrFail()->avatar;
        $this->upload($creator, UploadedFile::fake()->image('two.jpg'));
        $new = Store::firstOrFail()->avatar;

        $this->assertNotSame($old, $new);
        Storage::disk('assets')->assertMissing($old);
        Storage::disk('assets')->assertExists($new);
    }

    public function test_oversized_and_non_image_files_are_refused_with_an_avatar_error(): void
    {
        $creator = $this->creator('prashant');

        $this->upload($creator, UploadedFile::fake()->image('big.jpg')->size(4000))->assertSessionHasErrors('avatar');
        $this->upload($creator, UploadedFile::fake()->create('notes.pdf', 100, 'application/pdf'))->assertSessionHasErrors('avatar');

        $this->assertNull(Store::firstOrFail()->avatar);
    }

    public function test_bad_usernames_are_still_refused(): void
    {
        $creator = $this->creator('prashant');

        foreach (['Has Space', 'ab', 'admin', 'naïve', 'a/b'] as $bad) {
            $this->upload($creator, UploadedFile::fake()->image('me.jpg'), ['username' => $bad])->assertSessionHasErrors('username');
        }

        $this->assertNull(Store::firstOrFail()->avatar);
    }
}
