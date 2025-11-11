# @onionfi-internal/pubsub-client

## 2.2.0

### Minor Changes

- Make package public so it can be used from outside services

## 2.1.1

### Patch Changes

- Expose getPubSub method from PubSubClient

## 2.1.0

### Minor Changes

- [#425](https://github.com/onionfi/onionfi-services/pull/425) [`e6c0fa9`](https://github.com/onionfi/onionfi-services/commit/e6c0fa96ed2f93f3cae03822f6cba9f004fe886e) Thanks [@vfaramond](https://github.com/vfaramond)! - Cache PubSub topics

- [#285](https://github.com/onionfi/onionfi-services/pull/285) [`dec65cd`](https://github.com/onionfi/onionfi-services/commit/dec65cd5f6f8d191770984bf025cb7019ca87106) Thanks [@gradam](https://github.com/gradam)! - Exposed more configuration options to publishMessage method

- [#237](https://github.com/onionfi/onionfi-services/pull/237) [`fb47ec8`](https://github.com/onionfi/onionfi-services/commit/fb47ec8477039d52d35771eccbc635e09c2c558a) Thanks [@Gregjarvez](https://github.com/Gregjarvez)! - migrate to npm

- [#423](https://github.com/onionfi/onionfi-services/pull/423) [`68fa212`](https://github.com/onionfi/onionfi-services/commit/68fa2122e9572ca123f9ae474249edc1847e313c) Thanks [@davide-scalzo](https://github.com/davide-scalzo)! - updated google pubsub clients

- [#374](https://github.com/onionfi/onionfi-services/pull/374) [`6e95562`](https://github.com/onionfi/onionfi-services/commit/6e95562edd210e741129a333758106394387aa25) Thanks [@gradam](https://github.com/gradam)! - Update eslint to use common onionfi config

- [#343](https://github.com/onionfi/onionfi-services/pull/343) [`187e0e6`](https://github.com/onionfi/onionfi-services/commit/187e0e661d36e891d5fbcc57f021894c53d7307d) Thanks [@Gregjarvez](https://github.com/Gregjarvez)! - Context aware logger

- [#433](https://github.com/onionfi/onionfi-services/pull/433) [`d08acb4`](https://github.com/onionfi/onionfi-services/commit/d08acb41f0188acaf8cbb2dc890f2a648712bfbd) Thanks [@bikashpoudel2011](https://github.com/bikashpoudel2011)! - Tweak Batching config for pubsub subscription and topic and set MaxMessages to 1
  The tweak is made because we are experiencing slowness when acknowledging the messages
  Its not a breaking change so the change can be simply adapted by upgrading the version.

### Patch Changes

- [#241](https://github.com/onionfi/onionfi-services/pull/241) [`38c185e`](https://github.com/onionfi/onionfi-services/commit/38c185e5b566c3d1b3a4e3cf85e3ac7425718d15) Thanks [@gradam](https://github.com/gradam)! - Update typescript to v5

## 2.0.0

### Major Changes

- [`2bad64f`](https://github.com/onionfi/onionfi-services/commit/2bad64f65c3d6c024d9a3885bd40178f5d253fee) Thanks [@ilieionutcosmin](https://github.com/ilieionutcosmin)! - First publish!
