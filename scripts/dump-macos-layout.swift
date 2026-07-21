// Dump Apple's macOS "Khmer" keyboard layout straight from the OS.
//
// TISCreateInputSourceList finds com.apple.keylayout.Khmer whether or not the
// user has enabled it; UCKeyTranslate then answers what each physical key
// produces at each modifier level. This is the primary source — no chart, no
// transcription.
//
// Build: swiftc -O scripts/dump-macos-layout.swift -o dump-khmer
// Run:   ./dump-khmer [input-source-id]   (default com.apple.keylayout.Khmer)

import Carbon
import Foundation

let sourceID = CommandLine.arguments.count > 1
  ? CommandLine.arguments[1]
  : "com.apple.keylayout.Khmer"

let filter = [kTISPropertyInputSourceID as String: sourceID] as CFDictionary
guard
  let sources = TISCreateInputSourceList(filter, true)?.takeRetainedValue() as? [TISInputSource],
  let source = sources.first
else {
  FileHandle.standardError.write("no input source \(sourceID)\n".data(using: .utf8)!)
  exit(1)
}

guard let layoutPointer = TISGetInputSourceProperty(source, kTISPropertyUnicodeKeyLayoutData) else {
  FileHandle.standardError.write("\(sourceID) has no uchr layout data\n".data(using: .utf8)!)
  exit(1)
}

let layoutData = Unmanaged<CFData>.fromOpaque(layoutPointer).takeUnretainedValue() as Data

/// What `keyCode` produces with `modifiers` applied, as a Unicode string.
///
/// `deadKeyState` is carried across the call and reported: a key that sets a
/// dead key produces nothing on its own, which is a different thing from a key
/// that produces nothing at all.
func translate(_ keyCode: UInt16, modifiers: UInt32) -> (chars: String, dead: Bool) {
  var deadKeyState: UInt32 = 0
  var length = 0
  var buffer = [UniChar](repeating: 0, count: 8)

  let status = layoutData.withUnsafeBytes { raw -> OSStatus in
    let keyboard = raw.baseAddress!.assumingMemoryBound(to: UCKeyboardLayout.self)
    return UCKeyTranslate(
      keyboard,
      keyCode,
      UInt16(kUCKeyActionDown),
      modifiers,
      UInt32(LMGetKbdType()),
      OptionBits(kUCKeyTranslateNoDeadKeysBit),
      &deadKeyState,
      buffer.count,
      &length,
      &buffer
    )
  }

  guard status == noErr else { return ("", false) }
  return (String(utf16CodeUnits: buffer, count: length), deadKeyState != 0)
}

/// Modifier bitfields as UCKeyTranslate wants them: the Carbon modifier mask
/// shifted right by 8.
let levels: [(name: String, modifiers: UInt32)] = [
  ("base", 0),
  ("shift", UInt32(shiftKey >> 8)),
  ("alt", UInt32(optionKey >> 8)),
  ("shiftAlt", UInt32((shiftKey | optionKey) >> 8)),
]

print("# \(sourceID)")
print("# keyCode\tlevel\tcodepoints\tchars")

for keyCode in UInt16(0)...UInt16(127) {
  for level in levels {
    let (chars, dead) = translate(keyCode, modifiers: level.modifiers)
    if chars.isEmpty && !dead { continue }
    let codePoints = chars.unicodeScalars
      .map { "U+" + String(format: "%04X", $0.value) }
      .joined(separator: " ")
    print("\(keyCode)\t\(level.name)\t\(codePoints)\t\(chars)\(dead ? "\t[dead]" : "")")
  }
}
