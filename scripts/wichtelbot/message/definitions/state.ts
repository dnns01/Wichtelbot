enum State
{
    // As contact:
    Nothing = '',
    New = 'new',
    Registration = 'registration',
    // As contact/member:
    InformationGiftTypeAsTaker = 'questionGiftTypeAsTaker',
    InformationGiftTypeAsGiver = 'informationGiftTypeAsGiver',
	InformationAddress = 'informationAddress',
	InformationCountry = 'informationCountry',
	InformationDigitalAddress = 'informationDigitalAddress',
	InformationInternational = 'informationInternational',
	InformationWishList = 'informationWishList',
	InformationAllergies = 'informationAllergies',
	InformationGiftExclusion = 'informationGiftExclusion',
	InformationUserExclusion = 'informationUserExclusion',
    InformationFreeText = 'informationFreeText',
    // As member:
    ConfirmInformationChange = 'confirmInformationChange',
    Waiting = 'waiting',
    // As wichtel:
    MessageToGiftGiver = 'messageToGiftGiver',
    MessageToGiftTaker = 'messageToGiftTaker',
    ParcelSendConsignmentNumber = 'sendParcelConsignmentNumber',
    ParcelSendDate = 'parcelSendDate',
    ParcelReceivedDate = 'parcelReceivedDate',
}

export default State;
