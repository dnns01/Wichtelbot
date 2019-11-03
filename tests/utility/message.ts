import GeneralTestUtility from '../utility/general';

import { MessageWithParser } from '../../scripts/wichtelbot/message/definitions/message';
import MessageDefinition from '../../scripts/wichtelbot/message/definitions/message';
import User from '../../scripts/wichtelbot/message/definitions/user';
import { Channel, ChannelType } from '../../scripts/wichtelbot/message/definitions/channel';
import Client from '../../scripts/wichtelbot/message/definitions/client';
import State from '../../scripts/wichtelbot/message/definitions/state';
import Database from '../../scripts/wichtelbot/database';
import Member from '../../scripts/wichtelbot/classes/member';
import Contact from '../../scripts/wichtelbot/classes/contact';
import Information from '../../scripts/wichtelbot/classes/information';

type SendOrReplyFunction = (text: string, imageUrl?: string) => void;

export class TestMessage extends MessageWithParser implements MessageDefinition
{
    public content: string;
    public author: User;
    public channel: Channel;
    public client: Client;
    public reply: SendOrReplyFunction;

    constructor (reply: SendOrReplyFunction, userSend: SendOrReplyFunction, channelSend: SendOrReplyFunction, channelType: ChannelType)
    {
        super();

        // TODO: Utility for author/client creation.

        this.content = GeneralTestUtility.createRandomString();
        this.author = {
            id: GeneralTestUtility.createRandomString(),
            tag: GeneralTestUtility.createRandomString(),
            name: GeneralTestUtility.createRandomString(),
            isBot: false,
            send: userSend,
        };
        this.channel = {
            id: GeneralTestUtility.createRandomString(),
            type: channelType,
            send: channelSend,
        };
        this.client = {
            getChannel: (): Channel =>
            {
                return this.channel;
            },
            fetchUser: (): Promise<User> =>
            {
                return new Promise(
                    (resolve): void =>
                    {
                        resolve(this.author);
                    }
                );
            },
        };
        this.reply = reply;
    }
}

export class TestMessageWithFixedAuthor extends TestMessage
{
    constructor (reply: SendOrReplyFunction, userSend: SendOrReplyFunction, channelSend: SendOrReplyFunction, channelType: ChannelType)
    {
        super(reply, userSend, channelSend, channelType);

        this.author.id = 'testId';
        this.author.tag = 'testName#1234';
        this.author.name= 'testName';
    }
}

type TestCallbackContact = (text: string, author: Contact) => void;
type TestCallbackMember = (text: string, author: Member) => void;

export class CommandTestMessage extends TestMessage
{
    protected database: Database;
    protected testCallback: TestCallbackContact | TestCallbackMember;

    public called: boolean;

    constructor (database: Database, testCallback: TestCallbackContact | TestCallbackMember, channelType: ChannelType)
    {
        const resultCallback = (text: string): void =>
        {
            this.called = true;

            const whatIsThere = this.database.getWhatIsThere(this.author);

            if (!(whatIsThere instanceof Contact) && !(whatIsThere instanceof Member))
            {
                throw ReferenceError('The contact or member has not been prepared.');
            }

            this.testCallback(text, whatIsThere as any); // Hacks are allowed in test...
        };

        super(resultCallback, resultCallback, resultCallback, channelType);

        this.database = database;
        this.testCallback = testCallback;
        this.called = false;
    }

    public prepareContact (state: State): void
    {
        const contact = new Contact(this.author);
        contact.state = state;

        this.database.saveContact(contact);
    }

    public prepareMember (state: State, information?: Information): void
    {
        const contact = new Contact(this.author);
        contact.state = state;

        this.database.saveContact(contact);

        const member = new Member(contact, information);

        this.database.saveMember(member);
    }
}
