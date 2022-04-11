---
title: 'Drupal-based Journal Distribution'
summary: 'A Drupal distribution I created for hosting a modern academic journal. .'
displayOrder: 2
featured: true
hero:
  image: '/images/work/jlmms_landing_page.png'
  imageAlt: 'A screen shot of the Journal landing page.'
keyFacts:
  - primary: 'Drupal 9-based'
    secondary: 'Very little custom code needed'
  - primary: 'Editorial workflow'
    secondary: 'Peer-review allows reviewers to see submissions without seeing the authors.'
gallery:
  - title: 'Rich media content'
    summary: "Takes full advantage of Drupal's modern Media subsystem."
    image: '/images/work/jlmms_video.png'
  - title: 'Interactive content'
    summary: 'Integrates the powerful H5P interactive media creation system.'
    image: '/images/work/jlmms_h5p.png'
  - title: 'Powerful footnotes system'
    summary: 'Enables free-form notes with HTML formatting and formatted citations.'
    image: '/images/work/jlmms_footnotes.png'
---

## Journal of L. M. Montgomery Studies

Visit the site [here](https://journaloflmmontgomerystudies.ca/). Hosted by the [UPEI Robertson Library](https://library.upei.ca/), developed by myself and other members of the library's web team. This is a fully modern academic journal, but much more than just a repository for PDFs, we created an authoring experience that lets editors mix traditional scholarly content with interactive exhibits, multimedia, and eye-catching images.

## Journal Distribution

As the site architect, I based the site on a re-usable framework that can  spin up other journal sites easily.

[See it on my Github](https://github.com/alxp/journal).

### Open Sourced Components

I made sure to contribute back some of the custom code I wrote to power the site. Every module is hosted on [Drupal.org](https://drupal.org/):

#### [Bibcite Footnotes](https://drupal.org/project/bibcite_footnotes)
Lets an editor embed citations in content that link to properly-formatted citations powered by the excellent [Bibliography & Citation](https://drupal.org/project/bibcite) module.
#### [Media Attribution](https://drupal.org/project/media_attribution)
* Easily add copyright ownership and licencing captions to images.
* Comes with the standard [Creative Commons](https://creativecommons.org/) licenses and icons.
* Add new licenses as content items
* Tags images with correct semantic markup for harvesting by search engines.
#### [CKEditor Blockquote Attribution](https://www.drupal.org/project/ckeditor_blockquote_attribution)
* Toolbar button plugin for the [CKEditor](https://www.drupal.org/project/ckeditor) standard Drupal WYSIWYG editor.
* Lets content creators embed consistently-styled quote attributions as Blockquote captions.
* Generates semantically-correct HTML 5 markup for quoting an external source.
