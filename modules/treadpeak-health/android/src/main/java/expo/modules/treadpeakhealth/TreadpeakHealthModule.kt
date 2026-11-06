package expo.modules.treadpeakhealth

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.FloorsClimbedRecord
import androidx.health.connect.client.records.Record
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.metadata.Metadata
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import expo.modules.kotlin.activityresult.AppContextActivityResultLauncher
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.time.Instant
import java.time.format.DateTimeParseException
import kotlin.reflect.KClass

/**
 * Android counterpart of the Swift `TreadpeakHealthModule`: cumulative totals
 * from Health Connect.
 *
 * `aggregate` lets Health Connect merge overlapping records from different apps
 * using the user's own app-priority list, so steps are not double counted.
 * Aggregate has no recording-method filter, so records the user typed in by
 * hand are read separately and subtracted. Reads only work while the app is in
 * the foreground (no background-read permission is requested on purpose).
 */
class TreadpeakHealthModule : Module() {
  private lateinit var permissionLauncher: AppContextActivityResultLauncher<ArrayList<String>, Set<String>>

  private fun context(): Context = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private fun client(): HealthConnectClient {
    val context = context()
    if (HealthConnectClient.getSdkStatus(context) != HealthConnectClient.SDK_AVAILABLE) {
      throw HealthConnectUnavailableException()
    }
    return HealthConnectClient.getOrCreate(context)
  }

  override fun definition() = ModuleDefinition {
    // Must equal the Swift module name and the JS requireOptionalNativeModule key.
    Name("TreadpeakHealth")

    RegisterActivityContracts {
      permissionLauncher = registerForActivityResult(HealthPermissionsContract())
    }

    AsyncFunction("requestAuthorization") Coroutine { ->
      val client = client()
      val granted = try {
        client.permissionController.getGrantedPermissions()
      } catch (e: SecurityException) {
        throw HealthPermissionDeniedException(e)
      }
      // A partial grant is a deliberate choice the user manages in Health
      // Connect settings, so it is not re-prompted.
      if (PERMISSIONS.any { it in granted }) return@Coroutine true

      // If Android kills the activity while the dialog is open, Expo loses this
      // promise; the user just retries, so that case behaves like a denial.
      val result = permissionLauncher.launch(ArrayList(PERMISSIONS))
      PERMISSIONS.any { it in result }
    }

    AsyncFunction("getCumulativeSum") Coroutine { quantity: String, startISO: String, endISO: String ->
      val start = parseInstant(startISO)
      val end = parseInstant(endISO)
      // An empty or inverted range reads as 0, like on iOS.
      if (!start.isBefore(end)) return@Coroutine 0.0

      val client = client()
      val range = TimeRangeFilter.between(start, end)

      try {
        val total: Double
        val manual: Double
        when (quantity) {
          "stepCount" -> {
            val result = client.aggregate(
              AggregateRequest(metrics = setOf(StepsRecord.COUNT_TOTAL), timeRangeFilter = range),
            )
            total = (result[StepsRecord.COUNT_TOTAL] ?: 0L).toDouble()
            manual = manualEntrySum(client, StepsRecord::class, start, end) {
              Sample(it.startTime, it.endTime, it.count.toDouble())
            }
          }
          // iOS `distanceWalkingRunning` excludes cycling, but Health Connect's
          // DistanceRecord has no activity-type filter, so distance written by a
          // cycling app is included here. Excluding it would need exercise
          // session reads (a new permission), which are out of scope.
          "distanceWalkingRunning" -> {
            val result = client.aggregate(
              AggregateRequest(metrics = setOf(DistanceRecord.DISTANCE_TOTAL), timeRangeFilter = range),
            )
            total = result[DistanceRecord.DISTANCE_TOTAL]?.inMeters ?: 0.0
            manual = manualEntrySum(client, DistanceRecord::class, start, end) {
              Sample(it.startTime, it.endTime, it.distance.inMeters)
            }
          }
          "activeEnergyBurned" -> {
            val result = client.aggregate(
              AggregateRequest(metrics = setOf(ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL), timeRangeFilter = range),
            )
            total = result[ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL]?.inKilocalories ?: 0.0
            manual = manualEntrySum(client, ActiveCaloriesBurnedRecord::class, start, end) {
              Sample(it.startTime, it.endTime, it.energy.inKilocalories)
            }
          }
          "flightsClimbed" -> {
            val result = client.aggregate(
              AggregateRequest(metrics = setOf(FloorsClimbedRecord.FLOORS_CLIMBED_TOTAL), timeRangeFilter = range),
            )
            total = result[FloorsClimbedRecord.FLOORS_CLIMBED_TOTAL] ?: 0.0
            manual = manualEntrySum(client, FloorsClimbedRecord::class, start, end) {
              Sample(it.startTime, it.endTime, it.floors)
            }
          }
          else -> throw UnsupportedQuantityException(quantity)
        }
        maxOf(0.0, total - manual)
      } catch (e: SecurityException) {
        // Permission revoked after it was granted.
        throw HealthPermissionDeniedException(e)
      }
    }

    AsyncFunction("getHealthConnectStatus") Coroutine { ->
      when (HealthConnectClient.getSdkStatus(context())) {
        HealthConnectClient.SDK_AVAILABLE -> "available"
        HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> "updateRequired"
        else -> "unavailable"
      }
    }

    AsyncFunction("hasPermissions") Coroutine { ->
      val granted = try {
        client().permissionController.getGrantedPermissions()
      } catch (e: SecurityException) {
        throw HealthPermissionDeniedException(e)
      }
      PERMISSIONS.any { it in granted }
    }

    AsyncFunction("openHealthConnectInstall") {
      val context = context()
      val playIntent = Intent(Intent.ACTION_VIEW).apply {
        data = Uri.parse(
          "market://details?id=$PROVIDER_PACKAGE&url=healthconnect%3A%2F%2Fonboarding",
        )
        setPackage("com.android.vending")
        putExtra("overlay", true)
        putExtra("callerId", context.packageName)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      try {
        context.startActivity(playIntent)
      } catch (e: ActivityNotFoundException) {
        // No Play Store on this device: fall back to the web listing.
        val webIntent = Intent(
          Intent.ACTION_VIEW,
          Uri.parse("https://play.google.com/store/apps/details?id=$PROVIDER_PACKAGE"),
        ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(webIntent)
      }
    }
  }

  /**
   * How much of the aggregate came from records written with
   * `RECORDING_METHOD_MANUAL_ENTRY` inside `[start, end]`.
   *
   * Health Connect removes overlapping time before it sums, even between
   * records from the same app, so a manual entry that overlaps automatic data
   * is already (partly) missing from the aggregate. Subtracting its full value
   * would under-count. Each manual record is therefore prorated by the part of
   * its interval, inside the range, that no non-manual record covers.
   *
   * Known limitations: this assumes the automatic record wins an overlap, but
   * if the user's priority list ranks the manual entry's app above the source
   * of the automatic data, part of the manual entry stays in the total (errs
   * high); manual entries that overlap each other are not de-duplicated among
   * themselves; and apps that tag hand-typed data as UNKNOWN pass through
   * uncounted here. No `dataOriginFilter` is used: excluding a whole app would
   * also drop its automatic data.
   */
  private suspend fun <T : Record> manualEntrySum(
    client: HealthConnectClient,
    type: KClass<T>,
    start: Instant,
    end: Instant,
    sample: (T) -> Sample,
  ): Double {
    val manual = mutableListOf<Sample>()
    val automatic = mutableListOf<LongArray>()
    var token: String? = null
    do {
      val response = client.readRecords(
        ReadRecordsRequest(
          recordType = type,
          timeRangeFilter = TimeRangeFilter.between(start, end),
          pageToken = token,
        ),
      )
      for (record in response.records) {
        val s = sample(record)
        if (record.metadata.recordingMethod == Metadata.RECORDING_METHOD_MANUAL_ENTRY) {
          manual.add(s)
        } else {
          automatic.add(longArrayOf(s.startTime.toEpochMilli(), s.endTime.toEpochMilli()))
        }
      }
      token = response.pageToken
    } while (!token.isNullOrEmpty())

    if (manual.isEmpty()) return 0.0
    val covered = mergeIntervals(automatic)
    return manual.sumOf { it.value * uncoveredFraction(it, covered, start, end) }
  }

  /** Union of `[start, end]` millisecond intervals, sorted and non-overlapping. */
  private fun mergeIntervals(intervals: List<LongArray>): List<LongArray> {
    val merged = mutableListOf<LongArray>()
    for (i in intervals.sortedBy { it[0] }) {
      val last = merged.lastOrNull()
      if (last != null && i[0] <= last[1]) {
        if (i[1] > last[1]) last[1] = i[1]
      } else {
        merged.add(longArrayOf(i[0], i[1]))
      }
    }
    return merged
  }

  /**
   * Fraction of `record` that lies inside `[start, end]` and is not covered by
   * any interval in `covered` (which must be merged and sorted).
   */
  private fun uncoveredFraction(
    record: Sample,
    covered: List<LongArray>,
    start: Instant,
    end: Instant,
  ): Double {
    val durationMs = record.endTime.toEpochMilli() - record.startTime.toEpochMilli()
    // A zero-length record that matched the range filter lies inside it.
    if (durationMs <= 0) return 1.0
    val windowStart = maxOf(start.toEpochMilli(), record.startTime.toEpochMilli())
    val windowEnd = minOf(end.toEpochMilli(), record.endTime.toEpochMilli())
    if (windowEnd <= windowStart) return 0.0

    var uncoveredMs = windowEnd - windowStart
    for (c in covered) {
      val overlap = minOf(windowEnd, c[1]) - maxOf(windowStart, c[0])
      if (overlap > 0) uncoveredMs -= overlap
    }
    return (uncoveredMs.toDouble() / durationMs).coerceIn(0.0, 1.0)
  }

  /**
   * A record's interval and value in hook units. Needed because the library's
   * `IntervalRecord` interface is internal, so records are read through
   * per-type selectors instead of a shared supertype.
   */
  private class Sample(val startTime: Instant, val endTime: Instant, val value: Double)

  private fun parseInstant(iso: String): Instant =
    try {
      Instant.parse(iso)
    } catch (e: DateTimeParseException) {
      throw InvalidDateException(iso)
    }

  private companion object {
    const val PROVIDER_PACKAGE = "com.google.android.apps.healthdata"

    val PERMISSIONS: Set<String> = setOf(
      HealthPermission.getReadPermission(StepsRecord::class),
      HealthPermission.getReadPermission(DistanceRecord::class),
      HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class),
      HealthPermission.getReadPermission(FloorsClimbedRecord::class),
    )
  }
}

internal class HealthConnectUnavailableException :
  CodedException("ERR_HEALTH_CONNECT_UNAVAILABLE", "Health Connect is not available on this device", null)

internal class UnsupportedQuantityException(quantity: String) :
  CodedException("ERR_UNSUPPORTED_QUANTITY", "Unsupported quantity: $quantity", null)

internal class InvalidDateException(value: String) :
  CodedException("ERR_INVALID_DATE", "Invalid ISO 8601 date: $value", null)

internal class HealthPermissionDeniedException(cause: Throwable) :
  CodedException("ERR_HEALTH_PERMISSION_DENIED", "Health Connect permission was denied or revoked", cause)
