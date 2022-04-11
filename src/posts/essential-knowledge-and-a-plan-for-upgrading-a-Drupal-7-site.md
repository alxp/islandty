---
title: 'Essential Knowledge and a plan for upgrading a Drupal 7 site'
date: '2022-03-24'
tags: ['Tips And Tricks', 'Drupal']
---
This was a document I wrote up for my work colleagues as a guide for how the upcoming upgrade of our Drupal 7 web site is going to go. It's a distillation of various blog posts and personal experience, but with Drupal 7 End of Life being extended by another year, we can take the time to do the work properly

Treat this as a living document.: Wehn we answer the below questions, edit the document to include a link to the answer or put it inline if it's not too long.

Every section that asks a question about each module or content type should link to a spreadsheet that answers the question.

## Introductory

#### Background reading

Upgrading to Drupal 8: The 10 Essential Site Prep Tips

https://www.adkgroup.com/perspectives/upgrading-drupal-8-10-essential-site-prep-tips/

This is a couple of years old but contains good rules to folllow, such as not adding content or users to the staging site until the content migration is done.

Upgrading to Drupal 8: A Planning Guide | Forum One | Turn Ideas Into Impact.

https://www.forumone.com/ideas/upgrading-to-drupal-8-a-planning-guide/

High-level discussion of how an organization should plan for their upgrade, including roles and phases.

### Key Takeaways

Treat your migration like a new site build project, because it very much is one.

## Create a staging site

Strongly consider starting with the 'Minimal' install profile as Standard comes with quite a lot of default configurations that may conflict with the upgrade process.

## Content Audit

Install the Content Audit module on the existing site and produce a report.

https://www.drupal.org/project/content_audit

Determine if this infromation leads to any actionable insights, such as:

1. What content types are used by very few nodes?

### Books content

The Books module has been a part of Drupal core for a long time. Many sites that have been around a while make heavy use of books. 

We need to ask:

  1. Do we have any Books pages?
  2. Does the structure (parent pages, page order) need to be migrated? If so this increases complexity quite a bit, but we have experience with this process.
### Fields audit

Produce a list of the different field types on the site. For each one, answer the following:

1. Is this field in core?
2. Is this field provided by a module that has a Drupal 8+ version?
  1. If so, we still need to look at the module documentation (README, module home page, module issue queue) to find any upgrade steps that are unique to the module.
3. Are there fields that do the same thing and can be combined?
4. Are there fields that are going mostly unused that could be dropped?


## Module audit

Install the "Upgrade Status" module on the existing site and produce a report that will tell you which modules are upgradeable.

https://www.drupal.org/project/upgrade_status

Regardless of upgradeability, for every module on the site ask the following questions:

1. Is this module used now?
2. Is there an exportable configuration? Views should be exportable as an example, but we may want to consider which to migrate and which to drop.
3. Is the updated module covered by the Drupal Security Advisory program? If it's not we should seriously consider dropping it if possible. 

https://www.drupal.org/drupal-security-team/security-advisory-process-and-permissions-policy

## Users audit

1. Which users have not logged in in more than a year?

Users who may have used shared passwords in the past may have had their passwords leaked online. Any unauthorized login can compromise a site. Delete or block as many users as you are reasonably able to.

### Roles audit

1. What is each role's purpose?
2. Can any roles be combined in to one?
3. Is there anything in the theme or custom module code that depends on specific roles?
4. Is any role being used to gate content access? If so raise this as it will add a fair amount of complexity to the upgrade.

## Front-end 

### Choose a new theme

Drupal 8 themes are very different from Drupal 7, they are written in a different language. As well, modern web standards have evolved significantly since Drupal 7 themes were developed.

You need to choose a new theme that is:

- Responsive [1]
- Actively developed
- Accessible 

### Accessibility

Accessibility in this context means specifically that a web site can be used by people with varying access needs and who make use of several classes of assistive technology.

The biggest effect on your site's accessibility is the theme so this is a critical consideration.

### Edu-X

https://www.drupal.org/project/edux

https://rdm2.researchspaces.ca/

This is a good candidate for many sites in the education and library world.

### Theme customizations audit

The following questions need to be answered:

What custom theme hook implementations are on the existing site?

These can be on the page, node, field, or individual field instance level.

For each of these, does it apply to a content type that we have decided to port over? If not it can be left behind.

If it is, is it still necessary? Does the content make sense in the new site with the new theme before the customization is ported? If so it may be fine to leave as-is.

In general custom code should be treated as a liability rather than an asset. The more you ahve, the more time and effort you have to spend moving it around.


[1](https://www.smashingmagazine.com/2011/01/guidelines-for-responsive-web-design/)

## Content Migration

Once content types and fields are created, the migration can be constructed.

This will be using the Migrate module 