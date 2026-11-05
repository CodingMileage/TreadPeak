package expo.modules.treadpeakhealth

import android.content.Context
import android.content.Intent
import androidx.health.connect.client.PermissionController
import expo.modules.kotlin.activityresult.AppContextActivityResultContract

/**
 * Health Connect permission request as an Expo activity-result contract.
 *
 * The androidx contract is wrapped rather than launched through an androidx
 * `ActivityResultRegistry` because React Native cannot use the androidx
 * lifecycle-bound registry; Expo's own registry survives bridge reloads. The
 * input is an `ArrayList` because Expo requires contract inputs to be
 * `Serializable`.
 */
internal class HealthPermissionsContract :
  AppContextActivityResultContract<ArrayList<String>, Set<String>> {
  private val delegate = PermissionController.createRequestPermissionResultContract()

  override fun createIntent(context: Context, input: ArrayList<String>): Intent =
    delegate.createIntent(context, input.toSet())

  override fun parseResult(input: ArrayList<String>, resultCode: Int, intent: Intent?): Set<String> =
    delegate.parseResult(resultCode, intent)
}
