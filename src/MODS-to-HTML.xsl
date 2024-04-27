<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:mods="http://www.loc.gov/mods/v3"
    exclude-result-prefixes="xs mods" version="2.0">
    <xsl:output method="html" indent="yes"/>

    <!-- MODS -->
    <xsl:template match="mods:mods">
        <table class="mods">
            <xsl:apply-templates select="*"/>
        </table>
    </xsl:template>

    <!-- ignore non-selected elements -->
    <xsl:template match="text()"/>

    <!-- generate label -->
    <xsl:template name="generate-label">
        <xsl:param name="defaultLabel"/>
        <xsl:variable name="localName" select="local-name(.)"/>
        <xsl:variable name="fieldLabel"
            select="document('field-labels.xml')/labels/label[@code = $localName]/text()"/>
       
        <xsl:variable name="displayLabel">
            <xsl:choose>
                <!-- first choose the attribute displayLabel -->
                <xsl:when test="@displayLabel">
                    <xsl:value-of select="@displayLabel"/>
                </xsl:when>
                <!-- then choose the param passed in -->
                <xsl:when test="$defaultLabel">
                    <xsl:value-of select="$defaultLabel"/>
                </xsl:when>
                <!-- then use the value in the lookup table field-labels.xml -->
                <xsl:when test="$fieldLabel">
                    <xsl:value-of select="$fieldLabel"/>
                </xsl:when>
                <!-- otherwise use the local name of the element. -->
                <xsl:otherwise>
                    <xsl:value-of select="local-name(.)"/>
                </xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        <xsl:element name="th">
            <xsl:attribute name="scope">row</xsl:attribute>
            <xsl:attribute name="class">mods-label mods-<xsl:value-of select="$localName"/></xsl:attribute>
            <xsl:value-of select="$displayLabel"/>
        </xsl:element>
    </xsl:template>
    
    <!-- Standard row -->
    <xsl:template name="standard-row">
        <xsl:param name="defaultLabel"/>
        <tr>
            <xsl:call-template name="generate-label">
                <xsl:with-param name="defaultLabel" select="$defaultLabel"/>
            </xsl:call-template>
            <td>
                <xsl:value-of select="normalize-space(.)"/>
            </td>
        </tr>
    </xsl:template>
    
    <!-- TitleInfo segments -->
    <xsl:template name="titleInfo">
        <xsl:if test="mods:nonSort">
            <xsl:value-of select="mods:nonSort/normalize-space()"/>
            <xsl:text> </xsl:text>
        </xsl:if>
        <xsl:value-of select="mods:title/normalize-space()"/>
        <xsl:if test="mods:subTitle">
            <xsl:text> : </xsl:text>
            <xsl:value-of select="mods:subTitle/normalize-space()"/>
        </xsl:if>
        <xsl:if test="mods:partName">
            <xsl:text>. </xsl:text>
            <xsl:value-of select="mods:partName/normalize-space()"/>
        </xsl:if>
        <xsl:if test="mods:partNumber">
            <xsl:text>. </xsl:text>
            <xsl:value-of select="mods:partNumber/normalize-space()"/>
        </xsl:if>
    </xsl:template>
    
    <!-- Name parts -->
    <xsl:template name="name-parts">
        <xsl:choose>
            <!-- single namePart -->
            <xsl:when test="count(mods:namePart) = 1">
                <xsl:value-of select="mods:namePart/text()"/>
            </xsl:when>
            <!-- multiple nameParts, all with types => implode in LCNAF order with comma space. -->
            <xsl:when test="count(mods:namePart[not(@type)]) = 0">
                <xsl:variable name="given"
                    select="mods:namePart[@type = 'given']/text()"/>
                <xsl:variable name="family"
                    select="mods:namePart[@type = 'family']/text()"/>
                <xsl:variable name="date" select="mods:namePart[@type = 'date']/text()"/>
                <xsl:variable name="termsOfAddress"
                    select="mods:namePart[@type = 'termsOfAddress']/text()"/>
                <xsl:value-of
                    select="string-join(($family, $given, $termsOfAddress, $date), ', ')"
                />
            </xsl:when>
            <!-- otherwise => implode in natural order with comma space -->
            <xsl:otherwise>
                <xsl:for-each select="mods:namePart">
                    <xsl:value-of select="."/>
                    <xsl:if test="position() != last()">, </xsl:if>
                </xsl:for-each>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
   
    <!-- Main title -->
    <xsl:template match="(mods:mods | mods:relatedItem)/mods:titleInfo[not(@*)]">
        <tr>
            <xsl:call-template name="generate-label">
                <xsl:with-param name="defaultLabel">Title</xsl:with-param>
            </xsl:call-template>
            <td class="mods-data mods-title">
                <xsl:call-template name="titleInfo"/>
            </td>
        </tr>
    </xsl:template>
    
    <!-- Alt title -->
    <xsl:template match="(mods:mods | mods:relatedItem)/mods:titleInfo[@type]">
        <tr>
            <xsl:variable name="defaultLabel">
                <xsl:choose>
                    <xsl:when test="@type='abbreviated'">
                    <xsl:text>Abbreviated Title</xsl:text>
                    </xsl:when>
                </xsl:choose>
                <xsl:choose>
                    <xsl:when test="@type='translated'">
                        <xsl:text>Translated Title</xsl:text>
                    </xsl:when>
                </xsl:choose>
                <xsl:choose>
                    <xsl:when test="@type='alternative'">
                        <xsl:text>Alternative Title</xsl:text>
                    </xsl:when>
                </xsl:choose>
                <xsl:choose>
                    <xsl:when test="@type='uniform'">
                        <xsl:text>Uniform Title</xsl:text>
                    </xsl:when>
                </xsl:choose>
            </xsl:variable>
            <xsl:call-template name="generate-label">
                <xsl:with-param name="defaultLabel" select="$defaultLabel"/>
            </xsl:call-template>
            <td class="mods-data mods-alt-title">
                <xsl:call-template name="titleInfo"/>
            </td>
        </tr>
    </xsl:template>

    <!-- MODS name -->
    <xsl:template
        match="(mods:mods | mods:relatedItem)/mods:name[mods:namePart/text()]">
        <xsl:if test="count(mods:namePart/text()) > 0">
            <tr>
                <xsl:call-template name="generate-label"/>
                <td class="mods-data mods-name">
                    <!-- Name value. Note we are in this section because at least one namePart/text() exists. -->
                    <span class="mods-name-name">
                        <xsl:call-template name="name-parts"/>
                    </span>
                    <!--relator term, defaults to Attributed name -->
                    <span class="mods-name-role">
                        <xsl:text>(</xsl:text>
                        <xsl:choose>
                            <xsl:when test="mods:role/mods:roleTerm[@type = 'text']">
                                <xsl:variable name="roleText"
                                    select="mods:role/mods:roleTerm[@type = 'text']/text()"/>
                                <xsl:value-of select="$roleText"/>
                            </xsl:when>
                            <xsl:when
                                test="mods:role/mods:roleTerm[@authority = 'marcrelator' and @type = 'code']">
                                <xsl:variable name="roleCode"
                                    select="mods:role/mods:roleTerm[@authority = 'marcrelator' and @type = 'code']/text()"/>
                                <xsl:variable name="roleCode" select="lower-case($roleCode)"/>
                                <xsl:variable name="roleText"
                                    select="document('relators.xml')/relators/relator[@code = $roleCode]/text()"/>
                                <xsl:choose>
                                    <xsl:when test="$roleText">
                                        <xsl:value-of select="$roleText"/>
                                    </xsl:when>
                                    <xsl:otherwise>
                                        <xsl:comment>DATA ERROR: Relator code could not be found in code list.</xsl:comment>
                                        <xsl:value-of select="$roleCode"/>
                                    </xsl:otherwise>
                                </xsl:choose>
                            </xsl:when>
                            <xsl:otherwise>
                                <xsl:text>Attributed name</xsl:text>
                            </xsl:otherwise>
                        </xsl:choose>
                        <xsl:text>)</xsl:text>
                    </span>
                </td>
            </tr>
        </xsl:if>
    </xsl:template>

    <!-- Type of resource (uncontrolled but uppercased) -->
    <xsl:template match="(mods:mods | mods:relatedItem)/mods:typeOfResource">
        <tr>
            <xsl:call-template name="generate-label"/>
            <td>
                <xsl:variable name="resourceType" select="./text()"/>
                <xsl:variable name="resourceType"
                    select="concat(upper-case(substring($resourceType, 1, 1)), substring($resourceType, 2))"/>
                <xsl:value-of select="$resourceType"/>
            </td>
        </tr>
        <xsl:if test="@collection = 'yes'">
            <tr>
                <xsl:call-template name="generate-label"/>
            <td>
                <xsl:text>Collection</xsl:text>
            </td>
            </tr>
            
        </xsl:if>
    </xsl:template>

    <!-- Genre (uncontrolled) -->
    <xsl:template match="(mods:mods | mods:relatedItem)/mods:genre">
        <xsl:call-template name="standard-row"/>
    </xsl:template>

    <!-- OriginInfo -->
    <xsl:template
        match="(mods:mods | mods:relatedItem)/mods:originInfo/mods:place/mods:placeTerm[@authority = 'marccountry' and @type = 'code']">
        <tr>
            <xsl:call-template name="generate-label">
                <xsl:with-param name="defaultLabel">Place Published (Jurisdiction)</xsl:with-param>
            </xsl:call-template>
            <td>
                <xsl:variable name="placeCode" select="lower-case(normalize-space(.))"/>
                <xsl:variable name="placeText"
                    select="document('marccountry.xml')/countries/country[@code = $placeCode]/text()"/>
                <xsl:value-of select="$placeText"/>
            </td>
        </tr>
    </xsl:template>
    
    <xsl:template
        match="(mods:mods | mods:relatedItem)/mods:originInfo/mods:place/mods:placeTerm[not(@authority) and @type = 'text']">
        <xsl:call-template name="standard-row">
            <xsl:with-param name="defaultLabel">Place Published</xsl:with-param>
        </xsl:call-template>
    </xsl:template>
    <xsl:template match="(mods:mods | mods:relatedItem)/mods:originInfo/*[not(self::mods:place)]">
        <xsl:call-template name="standard-row"/>
    </xsl:template>

    <xsl:template match="(mods:mods | mods:relatedItem)/mods:language">
        <tr>
            <xsl:call-template name="generate-label"/>
            <td>
                <xsl:choose>
                    <xsl:when test="mods:languageTerm[@type='text']">
                        <xsl:value-of select="normalize-space(mods:languageTerm[@type='text'])"/>
                    </xsl:when>
                    <xsl:when test="mods:languageTerm[@type='code']">
                        <xsl:variable name="langCode"
                            select="mods:languageTerm[@type = 'code']/text()"/>
                        <xsl:variable name="langText"
                            select="document('ISO-639-2.xml')/languages/language[@code = $langCode]/text()"/>
                        <xsl:choose>
                            <xsl:when test="$langText">
                                <xsl:value-of select="$langText"/>
                            </xsl:when>
                            <xsl:otherwise>
                                <xsl:comment>DATA ERROR: Language code [<xsl:value-of select="$langCode"/>] could not be found in code list.</xsl:comment>
                            </xsl:otherwise>
                        </xsl:choose>
                    </xsl:when>
                </xsl:choose>
            </td>
        </tr>
    </xsl:template>

    <!-- Physical Description -->
    <xsl:template match="(mods:mods | mods:relatedItem)/mods:physicalDescription/*">
        <xsl:call-template name="standard-row"/>
    </xsl:template>
    
    <!-- Abstract etc -->
    <xsl:template match="(mods:mods | mods:relatedItem)/(mods:abstract|mods:tableOfContents|mods:targetAudience|mods:note)">
        <xsl:call-template name="standard-row"/>
    </xsl:template>
    
    <!-- Subject -->
    <xsl:template match="(mods:mods | mods:relatedItem)/mods:subject">
        <tr>
            <xsl:call-template name="generate-label"/>
            <td>
                <xsl:for-each select="*">
                    <xsl:choose>
                        <xsl:when test="local-name()='titleInfo'">
                            <xsl:call-template name="titleInfo"/>
                        </xsl:when>
                        <xsl:when test="local-name()='name'">
                            <xsl:call-template name="name-parts"/>
                        </xsl:when>
                        <xsl:when test="local-name()='hierarchicalGeographic'">
                            <xsl:for-each select="*">
                                <xsl:value-of select="text()"/>
                                <xsl:if test="position() != last()">--</xsl:if>
                            </xsl:for-each>
                        </xsl:when>
                        <!-- TODO: extract this to their own table rows. --> 
                        <xsl:when test="local-name()='cartographics'">
                            <xsl:for-each select="*">
                                <xsl:value-of select="local-name()"/>
                                <xsl:text>: </xsl:text>
                                <xsl:value-of select="text()"/>
                                <br/>
                            </xsl:for-each>
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:value-of select="text()"/>
                        </xsl:otherwise>
                    </xsl:choose>
                    <xsl:if test="position() != last()">--</xsl:if>
                </xsl:for-each>
            </td>
        </tr>
        
    </xsl:template>
    
    <!-- Classification -->
    <xsl:template match="(mods:mods | mods:relatedItem)/mods:classification">
        <xsl:variable name="classification-type" select="@authority"/>
        <xsl:call-template name="standard-row">
            <xsl:with-param name="defaultLabel">Classification<xsl:if test="$classification-type"> (<xsl:value-of select="$classification-type"/>)</xsl:if></xsl:with-param>
        </xsl:call-template>
    </xsl:template>
    
    <!-- Identifier -->
    <!-- todo: remove invalid identifiers. -->
    <xsl:template match="(mods:mods | mods:relatedItem)/mods:identifier">
        <xsl:variable name="identifier-type" select="@type"/>
        <xsl:call-template name="standard-row">
            <xsl:with-param name="defaultLabel">Identifier<xsl:if test="$identifier-type"> (<xsl:value-of select="$identifier-type"/>)</xsl:if></xsl:with-param>
        </xsl:call-template>
    </xsl:template>
    
    <!-- Location -->
    <xsl:template match="(mods:mods | mods:relatedItem)/mods:location">
        <xsl:for-each select="*">
            <xsl:if test="(local-name()=physicalLocation or local-name()='shelfLocator' or local-name()='url')">
                <xsl:call-template name="standard-row"/>
            </xsl:if>
            <xsl:if test="local-name()='holdingSimple'">
                
            </xsl:if> 
        </xsl:for-each>
    </xsl:template>
    
    <!-- Related Item -->
    <xsl:template match="mods:mods/mods:relatedItem">
        <tr>
            <xsl:variable name="relatedItemType" select="@type"/>
            <xsl:call-template name="generate-label">
                <xsl:with-param name="defaultLabel">Related Item (<xsl:value-of select="@type"/>)</xsl:with-param>
            </xsl:call-template>
            <td>
                Related Item
                <table>
                    <xsl:apply-templates></xsl:apply-templates>
                </table>
            </td>
        </tr>
        
    </xsl:template>
</xsl:stylesheet>
