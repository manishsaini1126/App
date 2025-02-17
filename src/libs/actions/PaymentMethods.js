import _ from 'underscore';
import {createRef} from 'react';
import Onyx from 'react-native-onyx';
import ONYXKEYS from '../../ONYXKEYS';
import * as API from '../API';
import CONST from '../../CONST';
import Navigation from '../Navigation/Navigation';
import * as CardUtils from '../CardUtils';
import ROUTES from '../../ROUTES';

/**
 * Sets up a ref to an instance of the KYC Wall component.
 */
const kycWallRef = createRef();

/**
 * When we successfully add a payment method or pass the KYC checks we will continue with our setup action if we have one set.
 */
function continueSetup() {
    if (!kycWallRef.current || !kycWallRef.current.continue) {
        Navigation.goBack();
        return;
    }

    // Close the screen (Add Debit Card, Add Bank Account, or Enable Payments) on success and continue with setup
    Navigation.goBack();
    kycWallRef.current.continue();
}

function openWalletPage() {
    const onyxData = {
        optimisticData: [
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: ONYXKEYS.IS_LOADING_PAYMENT_METHODS,
                value: true,
            },
        ],
        successData: [
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: ONYXKEYS.IS_LOADING_PAYMENT_METHODS,
                value: false,
            },
        ],
        failureData: [
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: ONYXKEYS.IS_LOADING_PAYMENT_METHODS,
                value: false,
            },
        ],
    };

    return API.read('OpenPaymentsPage', {}, onyxData);
}

/**
 *
 * @param {Number} bankAccountID
 * @param {Number} fundID
 * @param {Object} previousPaymentMethod
 * @param {Object} currentPaymentMethod
 * @param {Boolean} isOptimisticData
 * @return {Array}
 *
 */
function getMakeDefaultPaymentOnyxData(bankAccountID, fundID, previousPaymentMethod, currentPaymentMethod, isOptimisticData = true) {
    const onyxData = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.USER_WALLET,
            value: {
                walletLinkedAccountID: bankAccountID || fundID,
                walletLinkedAccountType: bankAccountID ? CONST.PAYMENT_METHODS.BANK_ACCOUNT : CONST.PAYMENT_METHODS.DEBIT_CARD,
            },
        },
    ];

    // Only clear the error if this is optimistic data. If this is failure data, we do not want to clear the error that came from the server.
    if (isOptimisticData) {
        onyxData[0].value.errors = null;
    }

    if (previousPaymentMethod) {
        onyxData.push({
            onyxMethod: Onyx.METHOD.MERGE,
            key: previousPaymentMethod.accountType === CONST.PAYMENT_METHODS.BANK_ACCOUNT ? ONYXKEYS.BANK_ACCOUNT_LIST : ONYXKEYS.FUND_LIST,
            value: {
                [previousPaymentMethod.methodID]: {
                    isDefault: !isOptimisticData,
                },
            },
        });
    }

    if (currentPaymentMethod) {
        onyxData.push({
            onyxMethod: Onyx.METHOD.MERGE,
            key: currentPaymentMethod.accountType === CONST.PAYMENT_METHODS.BANK_ACCOUNT ? ONYXKEYS.BANK_ACCOUNT_LIST : ONYXKEYS.FUND_LIST,
            value: {
                [currentPaymentMethod.methodID]: {
                    isDefault: isOptimisticData,
                },
            },
        });
    }

    return onyxData;
}

/**
 * Sets the default bank account or debit card for an Expensify Wallet
 *
 * @param {Number} bankAccountID
 * @param {Number} fundID
 * @param {Object} previousPaymentMethod
 * @param {Object} currentPaymentMethod
 *
 */
function makeDefaultPaymentMethod(bankAccountID, fundID, previousPaymentMethod, currentPaymentMethod) {
    API.write(
        'MakeDefaultPaymentMethod',
        {
            bankAccountID,
            fundID,
        },
        {
            optimisticData: getMakeDefaultPaymentOnyxData(bankAccountID, fundID, previousPaymentMethod, currentPaymentMethod, true, ONYXKEYS.FUND_LIST),
            failureData: getMakeDefaultPaymentOnyxData(bankAccountID, fundID, previousPaymentMethod, currentPaymentMethod, false, ONYXKEYS.FUND_LIST),
        },
    );
}

/**
 * Calls the API to add a new card.
 *
 * @param {Object} params
 */
function addPaymentCard(params) {
    const cardMonth = CardUtils.getMonthFromExpirationDateString(params.expirationDate);
    const cardYear = CardUtils.getYearFromExpirationDateString(params.expirationDate);

    API.write(
        'AddPaymentCard',
        {
            cardNumber: params.cardNumber,
            cardYear,
            cardMonth,
            cardCVV: params.securityCode,
            addressName: params.nameOnCard,
            addressZip: params.addressZipCode,
            currency: CONST.CURRENCY.USD,
            isP2PDebitCard: true,
        },
        {
            optimisticData: [
                {
                    onyxMethod: Onyx.METHOD.MERGE,
                    key: ONYXKEYS.FORMS.ADD_DEBIT_CARD_FORM,
                    value: {isLoading: true},
                },
            ],
            successData: [
                {
                    onyxMethod: Onyx.METHOD.MERGE,
                    key: ONYXKEYS.FORMS.ADD_DEBIT_CARD_FORM,
                    value: {isLoading: false},
                },
            ],
            failureData: [
                {
                    onyxMethod: Onyx.METHOD.MERGE,
                    key: ONYXKEYS.FORMS.ADD_DEBIT_CARD_FORM,
                    value: {isLoading: false},
                },
            ],
        },
    );
}

/**
 * Resets the values for the add debit card form back to their initial states
 */
function clearDebitCardFormErrorAndSubmit() {
    Onyx.set(ONYXKEYS.FORMS.ADD_DEBIT_CARD_FORM, {
        isLoading: false,
        errors: null,
    });
}

/**
 * Call the API to transfer wallet balance.
 * @param {Object} paymentMethod
 * @param {*} paymentMethod.methodID
 * @param {String} paymentMethod.accountType
 */
function transferWalletBalance(paymentMethod) {
    const paymentMethodIDKey = paymentMethod.accountType === CONST.PAYMENT_METHODS.BANK_ACCOUNT ? CONST.PAYMENT_METHOD_ID_KEYS.BANK_ACCOUNT : CONST.PAYMENT_METHOD_ID_KEYS.DEBIT_CARD;
    const parameters = {
        [paymentMethodIDKey]: paymentMethod.methodID,
    };

    API.write('TransferWalletBalance', parameters, {
        optimisticData: [
            {
                onyxMethod: 'merge',
                key: ONYXKEYS.WALLET_TRANSFER,
                value: {
                    loading: true,
                    errors: null,
                },
            },
        ],
        successData: [
            {
                onyxMethod: 'merge',
                key: ONYXKEYS.WALLET_TRANSFER,
                value: {
                    loading: false,
                    shouldShowSuccess: true,
                    paymentMethodType: paymentMethod.accountType,
                },
            },
        ],
        failureData: [
            {
                onyxMethod: 'merge',
                key: ONYXKEYS.WALLET_TRANSFER,
                value: {
                    loading: false,
                    shouldShowSuccess: false,
                },
            },
        ],
    });
}

function resetWalletTransferData() {
    Onyx.merge(ONYXKEYS.WALLET_TRANSFER, {
        selectedAccountType: '',
        selectedAccountID: null,
        filterPaymentMethodType: null,
        loading: false,
        shouldShowSuccess: false,
    });
}

/**
 * @param {String} selectedAccountType
 * @param {String} selectedAccountID
 */
function saveWalletTransferAccountTypeAndID(selectedAccountType, selectedAccountID) {
    Onyx.merge(ONYXKEYS.WALLET_TRANSFER, {selectedAccountType, selectedAccountID});
}

/**
 * Toggles the user's selected type of payment method (bank account or debit card) on the wallet transfer balance screen.
 * @param {String} filterPaymentMethodType
 */
function saveWalletTransferMethodType(filterPaymentMethodType) {
    Onyx.merge(ONYXKEYS.WALLET_TRANSFER, {filterPaymentMethodType});
}

function dismissSuccessfulTransferBalancePage() {
    Onyx.merge(ONYXKEYS.WALLET_TRANSFER, {shouldShowSuccess: false});
    Navigation.goBack(ROUTES.SETTINGS_WALLET);
}

/**
 * Looks through each payment method to see if there is an existing error
 * @param {Object} bankList
 * @param {Object} fundList
 * @returns {Boolean}
 */
function hasPaymentMethodError(bankList, fundList) {
    const combinedPaymentMethods = {...bankList, ...fundList};
    return _.some(combinedPaymentMethods, (item) => !_.isEmpty(item.errors));
}

/**
 * Clears the error for the specified payment item
 * @param {String} paymentListKey The onyx key for the provided payment method
 * @param {String} paymentMethodID
 */
function clearDeletePaymentMethodError(paymentListKey, paymentMethodID) {
    Onyx.merge(paymentListKey, {
        [paymentMethodID]: {
            pendingAction: null,
            errors: null,
        },
    });
}

/**
 * If there was a failure adding a payment method, clearing it removes the payment method from the list entirely
 * @param {String} paymentListKey The onyx key for the provided payment method
 * @param {String} paymentMethodID
 */
function clearAddPaymentMethodError(paymentListKey, paymentMethodID) {
    Onyx.merge(paymentListKey, {
        [paymentMethodID]: null,
    });
}

/**
 * Clear any error(s) related to the user's wallet
 */
function clearWalletError() {
    Onyx.merge(ONYXKEYS.USER_WALLET, {errors: null});
}

/**
 * Clear any error(s) related to the user's wallet terms
 */
function clearWalletTermsError() {
    Onyx.merge(ONYXKEYS.WALLET_TERMS, {errors: null});
}

function deletePaymentCard(fundID) {
    API.write(
        'DeletePaymentCard',
        {
            fundID,
        },
        {
            optimisticData: [
                {
                    onyxMethod: Onyx.METHOD.MERGE,
                    key: `${ONYXKEYS.FUND_LIST}`,
                    value: {[fundID]: {pendingAction: CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE}},
                },
            ],
        },
    );
}

export {
    deletePaymentCard,
    addPaymentCard,
    openWalletPage,
    makeDefaultPaymentMethod,
    kycWallRef,
    continueSetup,
    clearDebitCardFormErrorAndSubmit,
    dismissSuccessfulTransferBalancePage,
    transferWalletBalance,
    resetWalletTransferData,
    saveWalletTransferAccountTypeAndID,
    saveWalletTransferMethodType,
    hasPaymentMethodError,
    clearDeletePaymentMethodError,
    clearAddPaymentMethodError,
    clearWalletError,
    clearWalletTermsError,
};
