export type SubscriptionMethod = 'acknowledge' | 'modifyAckDeadline';

export enum ListMessagesMode {
  /**
   * Messages will be considered handled
   * and will be removed from subscription forever
   */
  ack,

  /**
   * Messages will return back to the subscription
   * available to be pulled again
   */
  nack,

  /**
   * Effectively do neither ack nor nack.
   * Consumer is responsible for ack/nack.
   */
  hold,
}

export type ListMessagesFilter = Partial<{
  id: string | string[];
}>;
