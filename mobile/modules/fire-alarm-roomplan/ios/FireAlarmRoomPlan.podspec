require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', '..', '..', 'package.json')))

Pod::Spec.new do |s|
  s.name         = 'FireAlarmRoomPlan'
  s.version      = package['version']
  s.summary      = 'Expo native RoomPlan scaffold for fire alarm room scanning.'
  s.description  = 'Placeholder Expo module bridge for future RoomPlan, ARKit, and Vision based fire alarm room scanning workflows.'
  s.license      = 'UNLICENSED'
  s.author       = 'AI Certify'
  s.homepage     = 'https://example.invalid/fire-alarm-roomplan'
  s.platforms    = { :ios => '16.0' }
  s.source       = { :path => '.' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '**/*.{h,m,mm,swift}'
  s.swift_version = '5.9'
end