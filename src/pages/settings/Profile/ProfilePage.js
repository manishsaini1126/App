import lodashGet from 'lodash/get';
import React, {useEffect} from 'react';
import {View} from 'react-native';
import PropTypes from 'prop-types';
import {withOnyx} from 'react-native-onyx';
import {ScrollView} from 'react-native-gesture-handler';
import _ from 'underscore';
import AvatarWithImagePicker from '../../../components/AvatarWithImagePicker';
import HeaderWithBackButton from '../../../components/HeaderWithBackButton';
import MenuItem from '../../../components/MenuItem';
import MenuItemWithTopDescription from '../../../components/MenuItemWithTopDescription';
import ScreenWrapper from '../../../components/ScreenWrapper';
import withCurrentUserPersonalDetails, {withCurrentUserPersonalDetailsDefaultProps, withCurrentUserPersonalDetailsPropTypes} from '../../../components/withCurrentUserPersonalDetails';
import withLocalize, {withLocalizePropTypes} from '../../../components/withLocalize';
import CONST from '../../../CONST';
import * as PersonalDetails from '../../../libs/actions/PersonalDetails';
import compose from '../../../libs/compose';
import Navigation from '../../../libs/Navigation/Navigation';
import * as UserUtils from '../../../libs/UserUtils';
import ROUTES from '../../../ROUTES';
import styles from '../../../styles/styles';
import * as Expensicons from '../../../components/Icon/Expensicons';
import ONYXKEYS from '../../../ONYXKEYS';
import withWindowDimensions, {windowDimensionsPropTypes} from '../../../components/withWindowDimensions';
import userPropTypes from '../userPropTypes';
import * as App from '../../../libs/actions/App';
import Permissions from '../../../libs/Permissions';

const propTypes = {
    /* Onyx Props */

    /** Login list for the user that is signed in */
    loginList: PropTypes.shape({
        /** Date login was validated, used to show brickroad info status */
        validatedDate: PropTypes.string,

        /** Field-specific server side errors keyed by microtime */
        errorFields: PropTypes.objectOf(PropTypes.objectOf(PropTypes.string)),
    }),

    user: userPropTypes,

    ...withLocalizePropTypes,
    ...windowDimensionsPropTypes,
    ...withCurrentUserPersonalDetailsPropTypes,
};

const defaultProps = {
    loginList: {},
    user: {},
    ...withCurrentUserPersonalDetailsDefaultProps,
};

function ProfilePage(props) {
    const getPronouns = () => {
        let pronounsKey = lodashGet(props.currentUserPersonalDetails, 'pronouns', '');
        if (pronounsKey.startsWith(CONST.PRONOUNS.PREFIX)) {
            pronounsKey = pronounsKey.slice(CONST.PRONOUNS.PREFIX.length);
        }

        if (!pronounsKey) {
            return props.translate('profilePage.selectYourPronouns');
        }
        return props.translate(`pronouns.${pronounsKey}`);
    };
    const currentUserDetails = props.currentUserPersonalDetails || {};
    const contactMethodBrickRoadIndicator = UserUtils.getLoginListBrickRoadIndicator(props.loginList);
    const avatarURL = lodashGet(currentUserDetails, 'avatar', '');
    const accountID = lodashGet(currentUserDetails, 'accountID', '');
    const emojiCode = lodashGet(props, 'currentUserPersonalDetails.status.emojiCode', '');

    const profileSettingsOptions = [
        {
            description: props.translate('displayNamePage.headerTitle'),
            title: lodashGet(currentUserDetails, 'displayName', ''),
            pageRoute: ROUTES.SETTINGS_DISPLAY_NAME,
        },
        {
            description: props.translate('contacts.contactMethod'),
            title: props.formatPhoneNumber(lodashGet(currentUserDetails, 'login', '')),
            pageRoute: ROUTES.SETTINGS_CONTACT_METHODS,
            brickRoadIndicator: contactMethodBrickRoadIndicator,
        },
        ...(Permissions.canUseCustomStatus(props.betas)
            ? [
                  {
                      description: props.translate('statusPage.status'),
                      title: emojiCode ? `${emojiCode} ${lodashGet(props, 'currentUserPersonalDetails.status.text', '')}` : '',
                      pageRoute: ROUTES.SETTINGS_STATUS,
                  },
              ]
            : []),
        {
            description: props.translate('pronounsPage.pronouns'),
            title: getPronouns(),
            pageRoute: ROUTES.SETTINGS_PRONOUNS,
        },
        {
            description: props.translate('timezonePage.timezone'),
            title: `${lodashGet(currentUserDetails, 'timezone.selected', '')}`,
            pageRoute: ROUTES.SETTINGS_TIMEZONE,
        },
    ];

    useEffect(() => {
        App.openProfile(props.currentUserPersonalDetails);
    }, [props.currentUserPersonalDetails]);

    return (
        <ScreenWrapper includeSafeAreaPaddingBottom={false}>
            <HeaderWithBackButton
                title={props.translate('common.profile')}
                onBackButtonPress={() => Navigation.goBack(ROUTES.SETTINGS)}
            />
            <ScrollView>
                <AvatarWithImagePicker
                    isUsingDefaultAvatar={UserUtils.isDefaultAvatar(lodashGet(currentUserDetails, 'avatar', ''))}
                    source={UserUtils.getAvatar(avatarURL, accountID)}
                    onImageSelected={PersonalDetails.updateAvatar}
                    onImageRemoved={PersonalDetails.deleteAvatar}
                    anchorPosition={styles.createMenuPositionProfile(props.windowWidth)}
                    anchorAlignment={{horizontal: CONST.MODAL.ANCHOR_ORIGIN_HORIZONTAL.LEFT, vertical: CONST.MODAL.ANCHOR_ORIGIN_VERTICAL.TOP}}
                    size={CONST.AVATAR_SIZE.LARGE}
                    pendingAction={lodashGet(props.currentUserPersonalDetails, 'pendingFields.avatar', null)}
                    errors={lodashGet(props.currentUserPersonalDetails, 'errorFields.avatar', null)}
                    errorRowStyles={[styles.mt6]}
                    onErrorClose={PersonalDetails.clearAvatarErrors}
                    previewSource={UserUtils.getFullSizeAvatar(avatarURL, accountID)}
                    originalFileName={currentUserDetails.originalFileName}
                    headerTitle={props.translate('profilePage.profileAvatar')}
                    style={[styles.mh5]}
                />
                <View style={[styles.mt4]}>
                    {_.map(profileSettingsOptions, (detail, index) => (
                        <MenuItemWithTopDescription
                            key={`${detail.title}_${index}`}
                            shouldShowRightIcon
                            title={detail.title}
                            description={detail.description}
                            onPress={() => Navigation.navigate(detail.pageRoute)}
                            brickRoadIndicator={detail.brickRoadIndicator}
                        />
                    ))}
                </View>
                <MenuItem
                    title={props.translate('privatePersonalDetails.personalDetails')}
                    icon={Expensicons.User}
                    onPress={() => Navigation.navigate(ROUTES.SETTINGS_PERSONAL_DETAILS)}
                    shouldShowRightIcon
                />
                {props.user.hasLoungeAccess && (
                    <MenuItem
                        title={props.translate('loungeAccessPage.loungeAccess')}
                        icon={Expensicons.LoungeAccess}
                        iconWidth={40}
                        iconHeight={40}
                        onPress={() => Navigation.navigate(ROUTES.SETTINGS_LOUNGE_ACCESS)}
                        shouldShowRightIcon
                    />
                )}
            </ScrollView>
        </ScreenWrapper>
    );
}

ProfilePage.propTypes = propTypes;
ProfilePage.defaultProps = defaultProps;
ProfilePage.displayName = 'ProfilePage';

export default compose(
    withLocalize,
    withWindowDimensions,
    withCurrentUserPersonalDetails,
    withOnyx({
        loginList: {
            key: ONYXKEYS.LOGIN_LIST,
        },
        user: {
            key: ONYXKEYS.USER,
        },
        betas: {
            key: ONYXKEYS.BETAS,
        },
    }),
)(ProfilePage);
