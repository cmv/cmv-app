#How to contribute (DRAFT)

Enhangements and bug fixes from the user community are essential for keeping CMV great. We want to keep it as easy as possible to contribute changes. There are a few guidelines that we need contributors to follow so that we can have a chance of keeping on top of things.

#Getting Started

- Make sure you have a [GitHub account](https://github.com/signup/free).

- Fork the repository on GitHub

#Making Changes

- Through [GitHub issues](https://github.com/cmv/cmv-app/issue/), or through the #cmv IRC channel on freenode.org, you talk about a feature you would like to see (or a bug), and why it should be in CMV.

- Create a topic branch from where you want to base your work.

    - This is usually the `develop` branch.

    - To quickly create a topic branch based on develop; git checkout -b fix/my_contribution develop. Please avoid working directly on the master branch.

- Make commits of logical units.

- Test your changes and please help us out by updating and implementing some automated tests if possible.

- Check for unnecessary whitespace with `git diff --check` before committing.

- Make sure your commit messages are in the proper format.
    (Example?)

#Submitting Changes

- Push your changes to a topic branch in your fork of the repository.

- Once you feel it is ready, submit the pull request to the cmv/cmv-app repository against the 'develop' branch ([more information on this can be found here](https://help.github.com/articles/creating-a-pull-request)).

- In the pull request, outline what you did and point to specific conversations (as in URL's) and issues that you are are resolving. This is a tremendous help for us in evaluation and acceptance.

- Once the pull request is in, please do not delete the branch or close the pull request (unless something is wrong with it).

- One of the members will evaluate it within a reasonable time period (which is to say usually within 2-4 weeks). Some things get evaluated faster or fast tracked. We are human and we have active lives outside of open source so don't fret if you haven't seen any activity on your pull request within a month or two. We don't have a Service Level Agreement (SLA) for pull requests. Just know that we will evaluate your pull request.

- If we have comments or questions when we do evaluate it and receive no response, it will probably lessen the chance of getting accepted.The core team looks at Pull Requests on a regular basis.

- After feedback has been given we expect responses within a reasonable time frame (2-4 weeks). After that time frame, we may close the pull request if it isn't showing any activity.

- If you reformat code or change core functionality without an approval from a person on the CMV team, it's likely that no matter how awesome it looks afterwards, it will probably not get accepted. Reformatting code makes it harder for us to evaluate exactly what was changed.

- If you do these things, it will be make evaluation and acceptance easy. Now if you stray outside of the guidelines we have above, it doesn't mean we are going to ignore your pull request. It will just make things harder for us. Harder for us roughly translates to a longer time to acceptance of your pull request.

#Additional Resources

- [General GitHub documentation](http://help.github.com/)
- [GitHub pull request documentation](http://help.github.com/send-pull-requests/)
- #cmv IRC channel on freenode.org