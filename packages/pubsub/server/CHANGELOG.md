# @onionfi-internal/pubsub-server

## 2.0.0

### Major Changes

- Make the package public so it can be used from other projects

## 1.2.0

### Minor Changes

- Accepts option subscriptionOptions overrides per handler

## 1.1.0

### Minor Changes

- [#237](https://github.com/onionfi/onionfi-services/pull/237) [`fb47ec8`](https://github.com/onionfi/onionfi-services/commit/fb47ec8477039d52d35771eccbc635e09c2c558a) Thanks [@Gregjarvez](https://github.com/Gregjarvez)! - migrate to npm

- [#355](https://github.com/onionfi/onionfi-services/pull/355) [`a5ff413`](https://github.com/onionfi/onionfi-services/commit/a5ff413a39fc04dce22253e611f3d30c6f863251) Thanks [@gradam](https://github.com/gradam)! - Update google-cloud/pubsub package

- [#423](https://github.com/onionfi/onionfi-services/pull/423) [`68fa212`](https://github.com/onionfi/onionfi-services/commit/68fa2122e9572ca123f9ae474249edc1847e313c) Thanks [@davide-scalzo](https://github.com/davide-scalzo)! - updated google pubsub clients

- [#374](https://github.com/onionfi/onionfi-services/pull/374) [`6e95562`](https://github.com/onionfi/onionfi-services/commit/6e95562edd210e741129a333758106394387aa25) Thanks [@gradam](https://github.com/gradam)! - Update eslint to use common onionfi config

- [#433](https://github.com/onionfi/onionfi-services/pull/433) [`d08acb4`](https://github.com/onionfi/onionfi-services/commit/d08acb41f0188acaf8cbb2dc890f2a648712bfbd) Thanks [@bikashpoudel2011](https://github.com/bikashpoudel2011)! - Tweak Batching config for pubsub subscription and topic and set MaxMessages to 1
  The tweak is made because we are experiencing slowness when acknowledging the messages
  Its not a breaking change so the change can be simply adapted by upgrading the version.

### Patch Changes

- [#241](https://github.com/onionfi/onionfi-services/pull/241) [`38c185e`](https://github.com/onionfi/onionfi-services/commit/38c185e5b566c3d1b3a4e3cf85e3ac7425718d15) Thanks [@gradam](https://github.com/gradam)! - Update typescript to v5
