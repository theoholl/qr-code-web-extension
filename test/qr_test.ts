import { assertNotEquals, assertThrows } from "@std/assert";
import qr from "../qr.ts";

Deno.test(function emptyString() {
  const result = qr.generate("");
  assertNotEquals(result, []);
});

Deno.test(function tooLongString() {
  const randomString = "a".repeat(2954);
  assertThrows(() => qr.generate(randomString));
});

// Deno.test(function extemelyLargeInput() {
//   // This QR will compile but unreadable because of the size.
//   const randomString = "a".repeat(2341);
//   const result = qr.generate(randomString);
//   assertNotEquals(result, []);
// }

// Deno.test(function unsupportedCharacters() {
//   assertThrows(() => qr.generate("Ͼ,😼"));
// });