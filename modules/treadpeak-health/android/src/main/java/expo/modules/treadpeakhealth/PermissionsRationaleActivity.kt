package expo.modules.treadpeakhealth

import android.app.Activity
import android.os.Bundle
import android.view.ViewGroup
import android.widget.ScrollView
import android.widget.TextView

/**
 * Health Connect permission rationale screen.
 *
 * Exported so Health Connect (and, through the alias, the Android 14+ settings
 * entry) can open it. It shows fixed text only and deliberately ignores intent
 * extras and data, so a hostile intent cannot influence what it displays.
 *
 * Play release requires this screen to also link the published privacy policy,
 * the same one as the store listing. TreadPeak has no published policy URL yet,
 * so that link is still missing and blocks a Play release.
 */
class PermissionsRationaleActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    val padding = (24 * resources.displayMetrics.density).toInt()
    val text = TextView(this).apply {
      setPadding(padding, padding, padding, padding)
      textSize = 16f
      text = RATIONALE
    }
    val scroll = ScrollView(this).apply {
      fitsSystemWindows = true
      addView(
        text,
        ViewGroup.LayoutParams(
          ViewGroup.LayoutParams.MATCH_PARENT,
          ViewGroup.LayoutParams.WRAP_CONTENT,
        ),
      )
    }
    setContentView(scroll)
  }

  private companion object {
    const val RATIONALE =
      "TreadPeak reads these Health Connect data types: steps, distance, active calories " +
        "burned and floors climbed. They are used to show your daily activity totals, to " +
        "count the steps of the walks you record and to rank you on TreadPeak leaderboards. " +
        "TreadPeak only reads this data and never writes to Health Connect. Entries typed in " +
        "by hand are not counted. You can change or remove TreadPeak's access at any time in " +
        "Health Connect settings."
  }
}
