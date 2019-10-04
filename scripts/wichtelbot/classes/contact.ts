import ContactType from '../types/contactType';

export default class Contact
{
    contactId: string; // The Discord ID, used as an unique contact ID.
    discordName: string; // The full Discord name, including display name and tag.
    name: string; // The base name in Discord.
    nickname: string; // A setable nickname for the user for readability purposes, defaults to the name.
    lastUpdateTime = 0; // Unix time
    type: ContactType = ContactType.Contact;
    state = ''; // The current state the contact is in, used for the communication tree.

    constructor (contactId: string, discordName: string, name: string)
    {
        this.contactId = contactId;
        this.discordName = discordName;
        this.name = name;
        this.nickname = name;
    }

    /**
     * Will create a full contact object from contact data. \
     * This is used to create complete objects from database data.
     * @param contactData An object with the same properties as the contact class.
     */
    public static fromContactData (contactData: Contact): Contact
    {
        let contact = new Contact(contactData.contactId, contactData.discordName, contactData.name);

        contact = Object.assign(contact, contactData);

        return contact;
    }
}
