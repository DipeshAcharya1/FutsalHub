<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;

class AuthSmokeTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_and_profile()
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Smoke',
            'email' => 'smoke_test@example.com',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ]);

        $response->assertStatus(201)->assertJsonStructure(['access_token', 'token_type', 'user']);

        $user = User::where('email', 'smoke_test@example.com')->first();
        $this->assertNotNull($user);

        $this->actingAs($user, 'sanctum')
             ->getJson('/api/me')
             ->assertStatus(200)
             ->assertJsonFragment(['email' => 'smoke_test@example.com']);
    }
}
