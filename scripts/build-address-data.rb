# Generates assets/customer-dashboard-countries.json from Shopify's open-source
# address database (https://github.com/Shopify/worldwide, MIT licence).
#
# The dashboard uses it for country-aware address forms: field order, labels,
# whether postal code / province are required, postal code patterns, and the
# exact `zoneCode` values the Customer Account API validates against.
#
# Usage (Ruby stdlib only, no gems):
#   git clone --depth 1 https://github.com/Shopify/worldwide /tmp/worldwide
#   ruby scripts/build-address-data.rb /tmp/worldwide/data/regions

require 'yaml'
require 'json'

regions_dir = ARGV[0] or abort 'Usage: ruby scripts/build-address-data.rb <worldwide>/data/regions'
output = File.expand_path('../assets/customer-dashboard-countries.json', __dir__)

def label(addresses, field)
  addresses&.dig(field, 'label', 'default')
end

countries = Dir[File.join(regions_dir, "*.yml")].sort.map do |path|
  data = YAML.safe_load(File.read(path), aliases: true)
  next unless data.is_a?(Hash) && data['code'].to_s.match?(/\A[A-Z]{2}\z/)
  next if data['deprecated'] || data['inhabited'] == false

  code = data['code']
  edit_format = data.dig('format', 'edit').to_s
  en_path = File.join(regions_dir, code, 'en.yml')
  addresses = File.exist?(en_path) ? YAML.safe_load(File.read(en_path), aliases: true)&.dig('en', 'worldwide', code, 'addresses') : nil

  show_provinces = edit_format.include?('{province}') && !data['hide_provinces_from_addresses']
  zones = show_provinces ? Array(data['zones']).map { |zone| [zone['code'].to_s, zone['name'].to_s] } : []

  entry = { 'c' => code, 'n' => data['name'], 'f' => edit_format }
  entry['z'] = zones unless zones.empty?
  entry['po'] = true if data['province_optional']
  if edit_format.include?('{zip}')
    entry['zr'] = data['zip_regex'] if data['zip_regex']
    entry['ze'] = data['zip_example'] if data['zip_example']
    entry['zo'] = true if %w[optional recommended].include?(data['zip_requirement'])
  end
  labels = {
    'province' => label(addresses, 'province'),
    'zip' => data['zip_label'] || label(addresses, 'zip'),
    'city' => label(addresses, 'city'),
    'address1' => label(addresses, 'address1'),
    'address2' => label(addresses, 'address2'),
  }.compact
  entry['l'] = labels unless labels.empty?
  entry
end.compact

countries.sort_by! { |country| country['n'] }
File.write(output, JSON.generate(countries))
puts "Wrote #{countries.size} countries (#{File.size(output)} bytes) to #{output}"
