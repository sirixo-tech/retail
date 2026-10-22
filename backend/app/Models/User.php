<?php

namespace App\Models;

use App\Modules\Identity\Models\User as IdentityUser;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class User extends IdentityUser
{
    /** @use HasFactory<UserFactory> */
    use HasFactory;
}
