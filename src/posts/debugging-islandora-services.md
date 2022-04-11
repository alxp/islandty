---
title: 'Debugging Islandora Services'
date: '2021-12-20'
tags: ['Tips And Tricks', 'Drupal', 'Islandora']
---

An Islandora service debugging journey.

I received a ticket reporting that FITS files were not being generated for media on our RDM site.

Here is the path I went on to discover the problem and fix it. Mostly it was a couple of misconfigurations due to migrating the site between servers, but I think the process of finding them might be educational.

## Karaf logging

Note that this log will soon be replaced by Alpaca's standalone Java jar's log file. See: https://github.com/Islandora/Alpaca/pull/82

In the mean time, I logged in to the host where FITS is running, and made sure it was still running by doing a wget:

```bash
wget https://localhost:8080/fits
```

Our system administrator has firewalled off all Java applications from even on-campus access due to the recent Log4J security vulnurabilities.

Seeing that FITS was still active, I went to the Karaf logs.

```bash
$ /opt/karaf/bin/client
karaf@root()> log:tail
```

This tails the Karaf log. I then went to my site/s /admin/content/media page and selected the 'Generate FITS file action and applied it to the media in question.

The Karaf logger then showed a couple of stack traces, at the top of which was:

```bash
exchange: Exchange[ID-rdm2-1625487460155-5-421] Exception: org.apache.http.conn.HttpHostConnectException: Connect to localhost:8000 [localhost/127.0.0.1] failed: Connection refused (Connection refused)
2021-12-20 18:17:21,811 | WARN  | -connector-fits] | EndpointMessageListener          | 57 - org.apache.camel.camel-core - 2.20.4 | Execution of JMS message listener failed. Caused by: [org.apache.camel.RuntimeCamelException - org.apache.http.conn.HttpHostConnectException: Connect to localhost:8000 [localhost/127.0.0.1] failed: Connection refused (Connection refused)]
org.apache.camel.RuntimeCamelException: org.apache.http.conn.HttpHostConnectException: Connect to localhost:8000 [localhost/127.0.0.1] failed: Connection refused (Connection refused)
```

Karaf is trying to connect to the Drupal site to put the FITS file on the media, but it is trying on port 8000, i.e., the default port for running on Vagrant. Since we moved this to a server, everything that would be on port 8000 is now on port 80, at least internally.

Since I don't know the Karaf configurations off by heart, I grepped every file in /opt/karaf for the string "localhost:8000" and found exactly what I needed to change:

/opt/karaf/deploy/ca.islandora.alpaca.connector.fits.blueprint.xml
```xml
  <cm:property-placeholder id="properties" persistent-id="ca.islandora.alpaca.connector.fits" update-strategy="reload" >
    <cm:default-properties>
      <cm:property name="error.maxRedeliveries" value="5"/>
      <cm:property name="in.stream" value="broker:queue:islandora-connector-fits"/>
      <cm:property name="derivative.service.url" value="http://localhost:8000/crayfits"/>
    </cm:default-properties>
  </cm:property-placeholder>
```
### WHere it's defined in Ansible 

In Ansible, this value is defined in a variable, which we just forgot to update in our inventory additions to deploy to the server.



Originally defined in the role: roles/internal/Islandora-Devops.alpaca/defaults/main.yml

Which you can then choose to override in your server's inventory.

### Restart the service

I removed the port number, and restarted Karaf (again, this process will involve Alpaca directly soon and Karaf will be gone.)

```bash
sudo systemctl restart karaf.service
```

Of course nothing is quite so simple, and the FITS file was still not getting attached to the media.

This time the Karaf logs gave a new error:

```bash
Suppressed: org.apache.camel.http.common.HttpOperationFailedException: HTTP operation failed invoking https://[server]/media/add_derivative/482/field_fits_file with statusCode: 500
... 25 more
```

500 errors mean the message got to Drupal and the error lies in it's logs.

The Recent Log Entries showed this error:

> Symfony\Component\HttpKernel\Exception\HttpException: The destination directory does not exist, could not be created, or is not writable in Drupal\islandora\MediaSource\MediaSourceService->putToMedia() (line 367 of /var/www/html/drupal/web/modules/contrib/islandora/src/MediaSource/MediaSourceService.php).

This is in Islandora's source code, unfortunately the exception does not tell us the actual directory that isn't getting created. I just quickly edited the source code on the server to include the $filename variable in the exception message. On bigger sites you would do this in a more civilized way, obviously.

I also intend to make a quick Pr to improve the error reporting. 

When I did print out the $filename, it said: "private://2021-12". I.e., it was trying to create a folder in Drupal's private file system. This is due to the specific configuration of the site. 

The private files folder location needs to be added to settings.php.

Once I did this, and cleared Drupal's cache, the errors went away and the FITS file was attached to the media as a file field, since we have it set up to use Multi-file Media.

Hopefully this can serve as a common starting point for how to start to debug the problem when Islandora just isn't generating your derivatives.

I think it also signposts some areas for improvement, such as making Karaf / Alpaca errors visible to the Drupal site user.