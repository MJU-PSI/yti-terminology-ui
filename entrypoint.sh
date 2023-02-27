#!/bin/sh
# inspired by https://github.com/jooooel/angular-config
set -e

# It is possible to overwrite configuration via environment variables.
# Input is of the form ANGULAR_CONFIG_APP_SETTING__VALUE=123
# It should replace { appSettings: { value: "123" }}
vars=$(set | awk -F '=' '
  $1 ~ /^ANGULAR_CONFIG/ {
    # Go from ANGULAR_CONFIG_APP_SETTING__VALUE to .app_setting.value
    gsub("ANGULAR_CONFIG_", ".", $1);
    gsub("__", ".", $1);
    $1=tolower($1);
    # Go from .app_setting.value to .appSetting.value (convert from snake case to camelcase)
    # In our example the four matched groups will be: .ap, p, s, etting.value
    # The third match should be uppsercased
    while ( match($1, /(.*)(\w)_(\w)(.*)/)) {
      cap[1] = gensub(/(.*)(\w)_(\w)(.*)/, "\\1", "1", $1);
      cap[2] = gensub(/(.*)(\w)_(\w)(.*)/, "\\2", "1", $1);
      cap[3] = gensub(/(.*)(\w)_(\w)(.*)/, "\\3", "1", $1);
      cap[4] = gensub(/(.*)(\w)_(\w)(.*)/, "\\4", "1", $1);
      $1 = cap[1] cap[2] toupper(cap[3]) cap[4];
    }
    # Replace single quotes with double quotes
    gsub("\x27", "\"", $2)
    # Concatenate variable name with value.
    # For example .appSetting.value=123
    print "\x27"$1"="$2"\x27"
  }')

for i in $vars
do
    :
  # Use jq to replace the values in the json file
  # Need to use a tmp file since we can't replace in place
  # https://stackoverflow.com/a/42718624/492067
  tmp=$(mktemp)
  echo "jq $i ./dist/configuration/configuration.json" | sh > "$tmp" && mv "$tmp" ./dist/configuration/configuration.json
done

# Set read permissions for everyone on the file
chmod +r ./dist/configuration/configuration.json

nginx
