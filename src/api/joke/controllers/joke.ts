/**
 * joke controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::joke.joke');


// A function to the jokes that do not belong to a censored tag, all the calls 
// here should return without censored tags unless safe_content is set to false

// The create function will assign id 88 to the author if the user is not authenticated
// also, it will throw an error if the joke does not start with "يقول لك"
// also, it will throw an error if the joke is less than 20 characters
// also, it will throw an error if the joke does not have at least one tag
// if the submitter is admin, the joke will be set to active without any vote count
// if the submitter is not admin, the joke will be set to pending and will need to be voted on


// for voting, the vote function will increment the vote count and if the vote count exceeds the joke_acceptance_threshold, the joke will be set to active or deleted
// the vote function will also check if the user has already voted on the joke, if so, it will throw an error
// the vote function will check if admin is voting, if so, it will force the joke to be active or deleted without any vote count
// the vote function will return the joke with the updated vote count and status
// the vote function will append an entry to the remarks field of the joke with the following format, 
// the vote is {vote_value}, total ups: {votes_up_count}, total downs:  {votes_down_count}, joke_acceptance_threshold is: {joke_acceptance_threshold}, status should be:  {targeted_joke_for_vote.status} at: {Date.now()}

// the update function will only update the content field of the joke
// the update function will throw an error if the joke is not found
// the update function will throw an error if the user is not the author of the joke
// the update function will throw an error if the joke is less than 20 characters
// the update function will throw an error if the joke does not have at least one tag
// the update will not allow the user to change the author of the joke or the status of the joke

// the delete function will delete the joke
// the delete function will throw an error if the user is not the author of the joke
// the delete function will throw an error if the joke is not found
// all deletes will be soft deletes and will be set to deleted_at to the current date


