/* eslint-disable import/no-unresolved */
import { Meteor } from 'meteor/meteor';
import { User } from 'meteor/socialize:user-model';

/* eslint-enable import/no-unresolved */

import { ParticipantsCollection } from '../../participant-model/common/participant-model.js';
import { ConversationsCollection } from '../common/conversation-model.js';

const callWithPromise = (method, ...myParameters) => new Promise((resolve, reject) => {
    Meteor.call(method, ...myParameters, (err, res) => {
        if (err) reject(err);
        resolve(res);
    });
});

User.methods({
    /**
    * Retrieve the conversations the user is currently involed in
    * @param   {Number}       limit     The maximum number of conversations to return
    * @param   {Number}       skip      The number of records to skip
    * @param   {String}       sortBy    The key to sort on
    * @param   {Number}       sortOrder The order in which to sort. 1 for ascending, -1 for descending
    * @returns {Mongo.Cursor} A cursor which returns Conversation instances
    */
    conversations(limit, skip, sortBy, sortOrder) {
        const options = {};
        const sort = {};

        // since conversations are groups of people and not owned by anyone in particular
        // we have to get a list of conversations the user is participating in first.
        const conversationIds = ParticipantsCollection.find({ userId: this._id }, { fields: { conversationId: true } }).map(participant => participant.conversationId);

        if (limit) {
            options.limit = limit;
        }
        if (sortBy && sortOrder) {
            sort[sortBy] = sortOrder;
            options.sort = sort;
        }

        return ConversationsCollection.find({ _id: { $in: conversationIds } }, options);
    },
    /**
     * Get the numer of unread conversations for the user
     * @return {Number} The number or unread conversations
     */
    numUnreadConversations() {
        return ParticipantsCollection.find({ userId: this._id, read: false }, { fields: { } }).count();
    },
    /**
     * Get the most recently updated conversation that the user is participating in
     * @return {Conversation} The newest conversation
     */
    newestConversation() {
        const participant = ParticipantsCollection.findOne({ userId: this._id }, { fields: { conversationId: true }, sort: { date: -1 } });
        return participant && ConversationsCollection.findOne(participant.conversationId);
    },
    /**
     *  Check if the user is participating in this conversation
     *  @param      {Conversation}  conversation   Conversation to check if the user is participating in
     *
     *  @returns    {Boolean} Whether the user is participating in the conversation or not
     */
    isParticipatingIn(conversation) {
        return !!ParticipantsCollection.findOne({ userId: this._id, conversationId: conversation._id, deleted: { $exists: false } });
    },
    /**
     *  Find existing conversation between this user a number of other users
     *
     *  @param  {Array} users   An array of userId's to check against
     *
     *  @param  {Function}  callback callback with the signature of a Meteor method call
     */
    async findExistingConversationWithUsers(users, callback) {
        if (callback) {
            return Meteor.call('findExistingConversationWithUsers', users, callback);
        }
        const conversation = await callWithPromise('findExistingConversationWithUsers', users);

        return conversation;
    },
});
