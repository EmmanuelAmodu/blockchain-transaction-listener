import { PubSub, Topic } from '@google-cloud/pubsub';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { CONTEXT, RequestContext } from '@nestjs/microservices';
import { FastifyRequest } from 'fastify';
import { TopicPublishOptions } from './types';

// TODO:
// Validate schema before we send the message and return nice error
// Potentially we can do this at build time or runtime as well (local interface vs pubsub schema)
@Injectable()
export class PubSubClient {
  /**
   * Variable to cache PubSub topics
   */
  private topics: Record<string, Topic> = {};

  private pubSub?: PubSub;

  constructor(
    @Optional() @Inject(CONTEXT) private readonly requestContext?: unknown,
  ) {}

  /**
   * PubSub leaks memory if you instantiate it twice.
   * We have the http and https app being instantiated so this leaks memory.
   * By doing this we are lazy loading the module instead of creating an instance
   * during module initialization.
   */
  public getPubSub(): PubSub {
    if (!this.pubSub) {
      this.pubSub = new PubSub();
    }
    return this.pubSub;
  }

  /**
   * Publishes data and attributes to the supplied Topic.
   * It uses only default publish options. If you want to override them, use getPubSub() to instantiate the topic yourself.
   * @param {string}  topicName - Name of the topic you want to send the message to.
   * @param {Record<string, any>} message - A JSON object that we send in the body, this can have multiple levels
   * @param {Record<string, string>=} attributes - A JSON object that lists the attributes we send to PubSub
   * @returns {string} This is the message Id we get from PubSub
   */
  public publishToTopic(
    topicName: string,
    message: Record<string, any>,
    attributes?: Record<string, string>,
  ): Promise<string> {
    const topic = this.getTopic(topicName);

    return topic.publishMessage({
      json: message,
      attributes: {
        ...(attributes || {}),
        'request-id': this.getRequestId(),
      },
    });
  }

  private getTopic(topicName: string): Topic {
    if (this.topics[topicName]) {
      return this.topics[topicName];
    }

    const topic = this.getPubSub().topic(
      topicName,
      TopicPublishOptions[topicName] ?? { batching: { maxMessages: 1 } },
    );
    this.topics[topicName] = topic;
    return topic;
  }

  private getRequestId(): string {
    if (!this.requestContext) {
      return '';
    }

    const request = this.requestContext as RequestContext | FastifyRequest;

    return 'headers' in request
      ? // This client maybe used in the context of an http microservice.
        // In that case we want to read the request id from the request headers
        request.headers['request-id']
      : request?.context?.attributes['request-id'];
  }
}
