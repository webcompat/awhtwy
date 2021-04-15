/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const TYPE_LABELS = {
  injection: "CSS/JS injection",
  ua_override: "User Agent override",
};

const PLATFORM_LABELS = {
  all: "All platforms",
  desktop: "Desktop",
  android: "Android",
};

module.exports = (intervention) => {
  intervention.type = TYPE_LABELS[intervention.type];
  intervention.platform = PLATFORM_LABELS[intervention.platform];

  return intervention;
};
