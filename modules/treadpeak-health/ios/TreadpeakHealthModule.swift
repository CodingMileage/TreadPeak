import ExpoModulesCore
import HealthKit

/**
 * Daily HealthKit totals via `HKStatisticsQuery`.
 *
 * Summing raw samples double-counts when an iPhone and an Apple Watch record
 * the same walk. A statistics query with `.cumulativeSum` merges overlapping
 * samples by source priority, the same way the Health app does. Samples the
 * user typed in by hand are excluded so manual entries cannot inflate the
 * leaderboards. Authorization is app-wide and is requested elsewhere
 * (`authorizeHealthKit`), so this module never asks for it.
 */
public class TreadpeakHealthModule: Module {
  private let healthStore = HKHealthStore()

  public func definition() -> ModuleDefinition {
    Name("TreadpeakHealth")

    AsyncFunction("getCumulativeSum") { (quantity: String, startISO: String, endISO: String) async throws -> Double in
      return try await self.cumulativeSum(quantity: quantity, startISO: startISO, endISO: endISO)
    }
  }

  /// Maps a short JS key to its HealthKit type and the unit the hook exposes.
  private func quantitySpec(for key: String) throws -> (HKQuantityType, HKUnit) {
    switch key {
    case "stepCount":
      return (HKQuantityType(.stepCount), HKUnit.count())
    default:
      throw Exception(name: "UnsupportedQuantity", description: "Unsupported quantity: \(key)")
    }
  }

  private func parseISODate(_ string: String) throws -> Date {
    if let date = ISO8601DateFormatter().date(from: string) {
      return date
    }
    let fractional = ISO8601DateFormatter()
    fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let date = fractional.date(from: string) {
      return date
    }
    throw Exception(name: "InvalidDate", description: "Invalid ISO 8601 date: \(string)")
  }

  /**
   * Returns the merged cumulative sum for `quantity` between the two ISO dates.
   *
   * Overlapping iPhone and Watch samples are merged by HealthKit source
   * priority, user-entered samples are excluded, and a range with no data
   * reads as 0 rather than throwing.
   */
  private func cumulativeSum(quantity: String, startISO: String, endISO: String) async throws -> Double {
    guard HKHealthStore.isHealthDataAvailable() else {
      throw Exception(name: "HealthDataUnavailable", description: "Health data is not available on this device")
    }

    let (type, unit) = try quantitySpec(for: quantity)
    let start = try parseISODate(startISO)
    let end = try parseISODate(endISO)

    let datePredicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
    let userEntered = HKQuery.predicateForObjects(withMetadataKey: HKMetadataKeyWasUserEntered, allowedValues: [true])
    // NOT(userEntered) keeps samples that carry no such metadata key at all.
    let notUserEntered = NSCompoundPredicate(notPredicateWithSubpredicate: userEntered)
    let predicate = NSCompoundPredicate(andPredicateWithSubpredicates: [datePredicate, notUserEntered])

    let store = healthStore
    return try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Double, Error>) in
      let query = HKStatisticsQuery(
        quantityType: type,
        quantitySamplePredicate: predicate,
        options: .cumulativeSum
      ) { _, statistics, error in
        if let error = error {
          if let hkError = error as? HKError, hkError.code == .errorNoData {
            continuation.resume(returning: 0)
          } else {
            continuation.resume(throwing: error)
          }
          return
        }
        continuation.resume(returning: statistics?.sumQuantity()?.doubleValue(for: unit) ?? 0)
      }
      store.execute(query)
    }
  }
}
