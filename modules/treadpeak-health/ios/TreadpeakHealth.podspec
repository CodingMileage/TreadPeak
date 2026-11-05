Pod::Spec.new do |s|
  s.name           = 'TreadpeakHealth'
  s.version        = '1.0.0'
  s.summary        = 'TreadPeak HealthKit statistics queries'
  s.description    = 'TreadPeak HealthKit statistics queries'
  s.license        = 'MIT'
  s.author         = 'TreadPeak'
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '16.4'
  }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'HealthKit'

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
