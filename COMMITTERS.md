#Committing changes to CMV (DRAFT)

We would like to make it easier for community members to contribute to CMV using pull requests, even if it makes the task of reviewing and committing these changes a little harder. Pull requests are only ever based on a single branch, however, we maintain more than one active branch. As a result contributors should target their changes at the `develop` branch. This makes the process of contributing a little easier for the contributor since they don't need to concern themselves with the question, "What branch do I base my changes on?" This is already called out in the [CONTRIBUTING.md](CONTRIBUTING.md).

Therefore, it is the responsibility of the committer to re-base the change set on the appropriate branch which should receive the contribution.

It is also the responsibility of the committer to review the change set in an effort to make sure the end users must opt-in to new behavior that is incompatible with previous behavior. Finally, it is the responsibility of the committer to make sure the develop and master branches are both clean and working at all times. Clean means that dead code is not allowed, everything needs to be usable in some manner at all points in time. 

The rest of this document addresses the concerns of the committer. This document will help guide the committer decide which branch to base, or re-base a contribution on top of. This document also describes our branch management strategy, which is closely related to the decision of what branch to commit changes into.

#Terminology

Many of these terms have more than one meaning. For the purposes of this document, the following terms refer to specific things.

__contributor__ - A person who makes a change to CMV and submits a change set in the form of a pull request.

__change set__ - A set of discrete patches which combined together form a contribution. A change set takes the form of Git commits and is submitted to CMV in the form of a pull request.

__committer__ - A person responsible for reviewing a pull request and then making the decision what base branch to merge the change set into.

__develop branch__ - The branch where new functionality that are not bug fixes is merged.

__master branch__ - The branch where bug fixes against the latest release or release candidate are merged.

#Review Process

This section provides a guide to follow while committing change sets to cmv base branches.

The process is as follows:

- A contributor sends a pull request (usually against `develop` branch).

- A committer typically reviews it within a week or two to determine the feasibility of the changes.

- In all cases politeness goes a long way. Please thank folks for contributions - they are going out of their way to help make the code base better, or adding something they may personally feel is necessary for the code base.

- Initial gotcha's to check for:

    - Did the user create a branch with these changes? If it is on their master, please ask them to review the contributing document.

    - Did the user reformat files and they should not have? Was is just white-space? You can try adding ?w=1 to the URL on GitHub.

    - Are there tests? Tests for new functionality are not required by highly desirable. Consider ask the contributor to review the contributing document and provide tests.

    - Is the code documented properly? Does this additional set of changes require changes to the wiki or documentation?

    - Was this code warranted? Did the contributor follow the process of gaining approval for big change sets? If not please have them review the contributing document and ask that they follow up with a case for putting the code into the code base on the mailing list.

- Review the code:

    - Does the code meet the naming conventions and formatting?

    - Is the code sound? Does it read well? Can you understand what it is doing without having to execute it? Principal of no clever hacks (need link).

    - Does the code do what the purpose of the pull request is for?

- Once you have reviewed the initial items, and are not waiting for additional feedback or work by the contributor, give the thumbs up that it is ready for the next part of the process (merging).

- Unless there is something wrong with the code, we don't ask contributors to try to stay in sync with develop branch. They did the work to create the patch in the first place, asking them to unnecessarily come back and try to keep their code synced up with develop is not an acceptable process.

#Merging

Once you have reviewed the change set and determined it is ready for merge, the next steps are to bring it local and evaluate the code further by actually working with it, running any tests locally and adding any additional commits or fix-ups that are necessary in a local branch.

When merging the user's contribution, it should be done with git merge --no-ff to create a merge commit so that in case there is an issue it becomes easier to revert later, and so that we can see where the code came from should we ever need to go find it later (more information on this can be found here and also a discussion on why this is a good idea here).
