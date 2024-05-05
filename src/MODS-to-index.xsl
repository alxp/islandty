<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:mods="http://www.loc.gov/mods/v3"
    exclude-result-prefixes="xs mods" version="2.0">
    <xsl:output method="html" indent="yes"/>

    <xsl:template match="*">
        <xsl:value-of select="normalize-space(.)"/>
        <xsl:text> </xsl:text>
        <xsl:apply-templates select="*"/>
    </xsl:template>

</xsl:stylesheet>
