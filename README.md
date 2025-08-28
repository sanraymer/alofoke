# Tor Macbook
brew install tor
brew services start tor
brew services stop tor
brew services restart tor
https://check.torproject.org/


tor -f ~/tor_config/torrc

nano ~/tor_config/torrc
SocksPort 9050 IsolateSOCKSAuth
ControlPort 9051
CookieAuthentication 0