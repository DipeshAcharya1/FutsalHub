<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class AdminDashboardController extends Controller
{
    /**
     * Ensure the authenticated user can manage the given futsal.
     * If the `futsals` table exists this will abort with 404/403 when appropriate.
     */
    private function authorizeFutsal(Request $request, $futsalId)
    {
        if (Schema::hasTable('futsals')) {
            $f = DB::table('futsals')->where('id', $futsalId)->first();
            if (! $f) {
                abort(404, 'Futsal not found');
            }
            if (property_exists($f, 'manager_id') && $request->user() && $f->manager_id != $request->user()->id) {
                abort(403, 'Forbidden');
            }
        }
    }
    /**
     * Return lists for futsals, bookings and users.
     */
    public function courts(Request $request, $futsalId): JsonResponse
    {
        $this->authorizeFutsal($request, $futsalId);

        if (! Schema::hasTable('courts')) {
            return response()->json([], 200);
        }

        $courts = DB::table('courts')->where('futsal_id', $futsalId)->orderBy('id', 'asc')->get();
        return response()->json($courts);
    }

    public function bookings(Request $request, $futsalId): JsonResponse
    {
        $this->authorizeFutsal($request, $futsalId);
        if (! Schema::hasTable('bookings')) {
            return response()->json([], 200);
        }
        $bookings = DB::table('bookings')->where('futsal_id', $futsalId)->orderBy('id', 'desc')->get();
        return response()->json($bookings);
    }

    public function users(Request $request, $futsalId): JsonResponse
    {
        $this->authorizeFutsal($request, $futsalId);
        if (! Schema::hasTable('users') || ! Schema::hasTable('bookings')) {
            return response()->json([], 200);
        }

        // return users who have bookings for this futsal
        $users = DB::table('users')
            ->join('bookings', 'users.id', '=', 'bookings.user_id')
            ->where('bookings.futsal_id', $futsalId)
            ->select('users.id', 'users.name', 'users.email', 'users.phone')
            ->distinct()
            ->orderBy('users.id', 'desc')
            ->get();
        return response()->json($users);
    }

    public function storeCourt(Request $request, $futsalId): JsonResponse
    {
        $this->authorizeFutsal($request, $futsalId);

        if (! Schema::hasTable('courts')) {
            return response()->json(['message' => 'Futsals table not found'], 500);
        }

        $data = $request->only(['name', 'location', 'price']);
        $validator = Validator::make($data, [
            'name' => 'required|string|max:255',
            'location' => 'nullable|string|max:255',
            'price' => 'nullable|numeric',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $id = DB::table('courts')->insertGetId(array_merge($data, ['futsal_id' => $futsalId, 'active' => true, 'created_at' => now(), 'updated_at' => now()]));
        $court = DB::table('courts')->where('id', $id)->first();
        return response()->json($court, 201);
    }

    public function updateCourt(Request $request, $futsalId, $id): JsonResponse
    {
        $this->authorizeFutsal($request, $futsalId);
        if (! Schema::hasTable('courts')) {
            return response()->json(['message' => 'Futsals table not found'], 500);
        }

        $data = $request->only(['name', 'location', 'price']);
        DB::table('courts')->where('id', $id)->where('futsal_id', $futsalId)->update(array_merge($data, ['updated_at' => now()]));
        $court = DB::table('courts')->where('id', $id)->first();
        return response()->json($court);
    }

    public function toggleActive(Request $request, $futsalId, $id): JsonResponse
    {
        $this->authorizeFutsal($request, $futsalId);
        if (! Schema::hasTable('courts')) {
            return response()->json(['message' => 'Futsals table not found'], 500);
        }
        $court = DB::table('courts')->where('id', $id)->where('futsal_id', $futsalId)->first();
        if (! $court) {
            return response()->json(['message' => 'Futsal not found'], 404);
        }
        $active = property_exists($court, 'active') ? ! $court->active : false;
        DB::table('courts')->where('id', $id)->update(['active' => $active, 'updated_at' => now()]);
        return response()->json(['id' => $id, 'active' => $active]);
    }

    public function timeslots(Request $request, $futsalId, $courtId): JsonResponse
    {
        $this->authorizeFutsal($request, $futsalId);
        if (! Schema::hasTable('timeslots')) {
            return response()->json([], 200);
        }
        // ensure court belongs to futsal
        if (Schema::hasTable('courts')) {
            $court = DB::table('courts')->where('id', $courtId)->where('futsal_id', $futsalId)->first();
            if (! $court) {
                return response()->json([], 200);
            }
        }
        $slots = DB::table('timeslots')->where('court_id', $courtId)->orderBy('start')->get();
        return response()->json($slots);
    }

    public function storeTimeslot(Request $request, $futsalId, $courtId): JsonResponse
    {
        $this->authorizeFutsal($request, $futsalId);
        if (! Schema::hasTable('timeslots')) {
            return response()->json(['message' => 'Timeslots table not found'], 500);
        }
        $data = $request->only(['start', 'end', 'price']);
        $validator = Validator::make($data, [
            'start' => 'required|string',
            'end' => 'required|string',
            'price' => 'nullable|numeric',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }
        $id = DB::table('timeslots')->insertGetId(array_merge($data, ['court_id' => $courtId, 'created_at' => now(), 'updated_at' => now()]));
        $slot = DB::table('timeslots')->where('id', $id)->first();
        return response()->json($slot, 201);
    }

    public function updateTimeslot(Request $request, $futsalId, $courtId, $tid): JsonResponse
    {
        $this->authorizeFutsal($request, $futsalId);
        if (! Schema::hasTable('timeslots')) {
            return response()->json(['message' => 'Timeslots table not found'], 500);
        }
        $data = $request->only(['start', 'end', 'price']);
        DB::table('timeslots')->where('id', $tid)->where('court_id', $courtId)->update(array_merge($data, ['updated_at' => now()]));
        $slot = DB::table('timeslots')->where('id', $tid)->first();
        return response()->json($slot);
    }

    public function deleteTimeslot(Request $request, $futsalId, $courtId, $tid): JsonResponse
    {
        $this->authorizeFutsal($request, $futsalId);
        if (! Schema::hasTable('timeslots')) {
            return response()->json(['message' => 'Timeslots table not found'], 500);
        }
        DB::table('timeslots')->where('id', $tid)->where('court_id', $courtId)->delete();
        return response()->json(['deleted' => true]);
    }

    public function reports(Request $request, $futsalId): JsonResponse
    {
        $this->authorizeFutsal($request, $futsalId);
        if (! Schema::hasTable('bookings')) {
            return response()->json(['data' => []]);
        }

        $period = $request->query('period', 'daily');
        $date = $request->query('date', null);
        $query = DB::table('bookings')->where('futsal_id', $futsalId);

        if ($date) {
            try {
                $d = Carbon::parse($date)->startOfDay();
            } catch (\Exception $e) {
                return response()->json(['message' => 'Invalid date'], 422);
            }
        }

        $data = [];
        if ($period === 'daily') {
            if ($date) {
                $query->whereDate('created_at', $d->toDateString());
            }
            $result = $query->selectRaw('DATE(created_at) as day, COUNT(*) as bookings, COALESCE(SUM(amount), SUM(price), 0) as revenue')
                ->groupBy('day')
                ->orderBy('day', 'desc')
                ->get();
            $data = $result;
        } elseif ($period === 'weekly') {
            if (! $date) {
                $d = Carbon::now()->startOfWeek();
            }
            $start = $d->copy()->startOfWeek();
            $end = $start->copy()->addDays(6)->endOfDay();
            $result = $query->whereBetween('created_at', [$start, $end])
                ->selectRaw('DATE(created_at) as day, COUNT(*) as bookings, COALESCE(SUM(amount), SUM(price), 0) as revenue')
                ->groupBy('day')
                ->orderBy('day', 'asc')
                ->get();
            $data = $result;
        } else { // monthly
            if ($date) {
                $month = $d->month;
                $year = $d->year;
                $query->whereYear('created_at', $year)->whereMonth('created_at', $month);
            }
            $result = $query->selectRaw('MONTH(created_at) as month, COUNT(*) as bookings, COALESCE(SUM(amount), SUM(price), 0) as revenue')
                ->groupBy('month')
                ->orderBy('month', 'desc')
                ->get();
            $data = $result;
        }

        return response()->json(['data' => $data]);
    }

    /**
     * Super-admin: list all futsals
     */
    public function allFutsals(Request $request): JsonResponse
    {
        if (! $request->user() || $request->user()->role !== 'super-admin') abort(403);
        if (! Schema::hasTable('futsals')) return response()->json([], 200);
        $futsals = DB::table('futsals')->orderBy('id','asc')->get();
        return response()->json($futsals);
    }

    public function storeFutsal(Request $request): JsonResponse
    {
        if (! $request->user() || $request->user()->role !== 'super-admin') abort(403);
        if (! Schema::hasTable('futsals')) return response()->json(['message'=>'Futsals table not found'],500);
        $data = $request->only(['name','location','manager_id']);
        $id = DB::table('futsals')->insertGetId(array_merge($data, ['created_at'=>now(),'updated_at'=>now(), 'active'=>true]));
        $f = DB::table('futsals')->where('id',$id)->first();
        return response()->json($f,201);
    }

    public function updateFutsal(Request $request, $id): JsonResponse
    {
        if (! $request->user() || $request->user()->role !== 'super-admin') abort(403);
        if (! Schema::hasTable('futsals')) return response()->json(['message'=>'Futsals table not found'],500);
        $data = $request->only(['name','location','manager_id','active']);
        DB::table('futsals')->where('id',$id)->update(array_merge($data, ['updated_at'=>now()]));
        $f = DB::table('futsals')->where('id',$id)->first();
        return response()->json($f);
    }

    public function toggleFutsalActive(Request $request, $id): JsonResponse
    {
        if (! $request->user() || $request->user()->role !== 'super-admin') abort(403);
        if (! Schema::hasTable('futsals')) return response()->json(['message'=>'Futsals table not found'],500);
        $f = DB::table('futsals')->where('id',$id)->first(); if (! $f) return response()->json(['message'=>'Not found'],404);
        $active = property_exists($f,'active') ? ! $f->active : false;
        DB::table('futsals')->where('id',$id)->update(['active'=>$active,'updated_at'=>now()]);
        return response()->json(['id'=>$id,'active'=>$active]);
    }

    public function allBookings(Request $request): JsonResponse
    {
        if (! $request->user() || $request->user()->role !== 'super-admin') abort(403);
        if (! Schema::hasTable('bookings')) return response()->json([],200);
        $b = DB::table('bookings')->orderBy('id','desc')->get();
        return response()->json($b);
    }

    public function allUsers(Request $request): JsonResponse
    {
        if (! $request->user() || $request->user()->role !== 'super-admin') abort(403);
        if (! Schema::hasTable('users')) return response()->json([],200);
        $u = DB::table('users')->orderBy('id','desc')->get();
        return response()->json($u);
    }

    // Global courts
    public function allCourts(Request $request): JsonResponse
    {
        if (! $request->user() || $request->user()->role !== 'super-admin') abort(403);
        if (! Schema::hasTable('courts')) return response()->json([],200);
        $c = DB::table('courts')->orderBy('id','asc')->get();
        return response()->json($c);
    }

    public function storeCourtGlobal(Request $request): JsonResponse
    {
        if (! $request->user() || $request->user()->role !== 'super-admin') abort(403);
        if (! Schema::hasTable('courts')) return response()->json(['message'=>'Courts table not found'],500);
        $data = $request->only(['name','location','price','futsal_id']);
        $id = DB::table('courts')->insertGetId(array_merge($data,['created_at'=>now(),'updated_at'=>now(),'active'=>true]));
        $c = DB::table('courts')->where('id',$id)->first();
        return response()->json($c,201);
    }

    public function updateCourtGlobal(Request $request, $id): JsonResponse
    {
        if (! $request->user() || $request->user()->role !== 'super-admin') abort(403);
        $data = $request->only(['name','location','price','active']);
        DB::table('courts')->where('id',$id)->update(array_merge($data,['updated_at'=>now()]));
        $c = DB::table('courts')->where('id',$id)->first();
        return response()->json($c);
    }

    public function toggleCourtActiveGlobal(Request $request, $id): JsonResponse
    {
        if (! $request->user() || $request->user()->role !== 'super-admin') abort(403);
        if (! Schema::hasTable('courts')) return response()->json(['message'=>'Courts table not found'],500);
        $c = DB::table('courts')->where('id',$id)->first(); if (! $c) return response()->json(['message'=>'Not found'],404);
        $active = property_exists($c,'active') ? ! $c->active : false;
        DB::table('courts')->where('id',$id)->update(['active'=>$active,'updated_at'=>now()]);
        return response()->json(['id'=>$id,'active'=>$active]);
    }

    // Timeslots global by court id
    public function timeslotsGlobal(Request $request, $courtId): JsonResponse
    {
        if (! $request->user() || $request->user()->role !== 'super-admin') abort(403);
        if (! Schema::hasTable('timeslots')) return response()->json([],200);
        $slots = DB::table('timeslots')->where('court_id',$courtId)->orderBy('start')->get();
        return response()->json($slots);
    }

    public function storeTimeslotGlobal(Request $request, $courtId): JsonResponse
    {
        if (! $request->user() || $request->user()->role !== 'super-admin') abort(403);
        $data = $request->only(['start','end','price']);
        $id = DB::table('timeslots')->insertGetId(array_merge($data,['court_id'=>$courtId,'created_at'=>now(),'updated_at'=>now()]));
        $s = DB::table('timeslots')->where('id',$id)->first();
        return response()->json($s,201);
    }

    public function updateTimeslotGlobal(Request $request, $courtId, $tid): JsonResponse
    {
        if (! $request->user() || $request->user()->role !== 'super-admin') abort(403);
        $data = $request->only(['start','end','price']);
        DB::table('timeslots')->where('id',$tid)->where('court_id',$courtId)->update(array_merge($data,['updated_at'=>now()]));
        $s = DB::table('timeslots')->where('id',$tid)->first();
        return response()->json($s);
    }

    public function deleteTimeslotGlobal(Request $request, $courtId, $tid): JsonResponse
    {
        if (! $request->user() || $request->user()->role !== 'super-admin') abort(403);
        DB::table('timeslots')->where('id',$tid)->where('court_id',$courtId)->delete();
        return response()->json(['deleted'=>true]);
    }
}
