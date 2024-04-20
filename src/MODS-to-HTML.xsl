<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:mods="http://www.loc.gov/mods/v3"
    xmlns="http://www.loc.gov/mods/v3" exclude-result-prefixes="xs" version="2.0">
    <xsl:output method="xml" indent="yes"/>

    <!-- MODS -->
    <xsl:template match="mods:mods">
        <h2>Metadata</h2>
        <table class="mods">
            <xsl:apply-templates select="*"/>
        </table>
    </xsl:template>

    <!-- ignore non-selected elements -->
    <xsl:template match="text()"/>

    <!-- generate label -->
    <xsl:template name="generate-label">
        <xsl:param name="defaultLabel"/>
        <xsl:variable name="displayLabel">
            <xsl:choose>
                <xsl:when test="@displayLabel">
                    <xsl:value-of select="@displayLabel"/>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:value-of select="$defaultLabel"/>
                </xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        <xsl:variable name="modsElement" select="local-name()"/>
        <xsl:element name="th">
            <xsl:attribute name="scope">row</xsl:attribute>
            <xsl:attribute name="class">mods-label mods-<xsl:value-of select="$modsElement"
                /></xsl:attribute>
            <xsl:value-of select="$displayLabel"/>
        </xsl:element>
    </xsl:template>

    <!-- Main title -->
    <xsl:template match="mods:mods/mods:titleInfo[not(@*)]">
        <tr>
            <xsl:call-template name="generate-label">
                <xsl:with-param name="defaultLabel">Title</xsl:with-param>
            </xsl:call-template>
            <td class="mods-data mods-title">
                <xsl:if test="mods:nonSort">
                    <xsl:value-of select="mods:nonSort/normalize-space()"/>
                    <xsl:text> </xsl:text>
                </xsl:if>
                <xsl:value-of select="mods:title/normalize-space()"/>
                <xsl:if test="mods:subTitle">
                    <xsl:text> : </xsl:text>
                    <xsl:value-of select="mods:subTitle/normalize-space()"/>
                </xsl:if>
            </td>
        </tr>
    </xsl:template>
    
    <!-- Alt title -->
    <xsl:template match="mods:mods/mods:titleInfo[@type]">
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
            <td class="mods-data mods-title">
                <xsl:if test="mods:nonSort">
                    <xsl:value-of select="mods:nonSort/normalize-space()"/>
                    <xsl:text> </xsl:text>
                </xsl:if>
                <xsl:value-of select="mods:title/normalize-space()"/>
                <xsl:if test="mods:subTitle">
                    <xsl:text> : </xsl:text>
                    <xsl:value-of select="mods:subTitle/normalize-space()"/>
                </xsl:if>
            </td>
        </tr>
    </xsl:template>

    <!-- MODS name -->
    <xsl:template
        match="mods:mods/mods:name[mods:namePart/text()]">
        <xsl:if test="count(mods:namePart/text()) > 0">
            <tr>
                <xsl:call-template name="generate-label">
                    <xsl:with-param name="defaultLabel">Name</xsl:with-param>
                </xsl:call-template>
                <td class="mods-data mods-name">
                    <!-- Name value. Note we are in this section because at least one namePart/text() exists. -->
                    <span class="mods-name-name">
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
    <xsl:template match="mods:mods/mods:typeOfResource">
        <tr>
            <xsl:call-template name="generate-label">
                <xsl:with-param name="defaultLabel">Resource Type</xsl:with-param>
            </xsl:call-template>
            <td>
                <xsl:variable name="resourceType" select="./text()"/>
                <xsl:variable name="resourceType"
                    select="concat(upper-case(substring($resourceType, 1, 1)), substring($resourceType, 2))"/>
                <xsl:value-of select="$resourceType"/>
            </td>
        </tr>
        <xsl:if test="@collection = 'yes'">
            <tr>
                <xsl:call-template name="generate-label">
                <xsl:with-param name="defaultLabel">Resource Type</xsl:with-param>
            </xsl:call-template>
            <td>
                <xsl:text>Collection</xsl:text>
            </td>
            </tr>
            
        </xsl:if>
    </xsl:template>

    <!-- Genre (uncontrolled) -->
    <xsl:template match="mods:mods/mods:genre">
        <tr>
            <xsl:call-template name="generate-label">
                <xsl:with-param name="defaultLabel">Genre</xsl:with-param>
            </xsl:call-template>
            <td>
            <xsl:value-of select="./text()"/>
            </td>
        </tr>
    </xsl:template>

    <!-- OriginInfo -->
    <xsl:template
        match="mods:mods/mods:originInfo/mods:place/mods:placeTerm[@authority = 'marccountry' and @type = 'code']">
        <field_place_published_country>
            <xsl:value-of select="normalize-space(.)"/>
        </field_place_published_country>
    </xsl:template>
    <xsl:template
        match="mods:mods/mods:originInfo/mods:place/mods:placeTerm[not(@authority) and @type = 'text']">
        <field_place_published>
            <xsl:value-of select="normalize-space(.)"/>
        </field_place_published>
    </xsl:template>
    <xsl:template match="mods:mods/mods:originInfo/mods:publisher">
        <field_linked_agent>
            <xsl:text>relators:pbl:corporate_body:</xsl:text>
            <xsl:value-of select="normalize-space()"/>
        </field_linked_agent>
    </xsl:template>
    <xsl:template match="mods:mods/mods:originInfo/mods:dateIssued">
        <field_edtf_date_issued>
            <xsl:value-of select="normalize-space()"/>
        </field_edtf_date_issued>
    </xsl:template>
    <xsl:template match="mods:mods/mods:originInfo/mods:dateOther">
        <field_edtf_date>
            <xsl:value-of select="normalize-space()"/>
        </field_edtf_date>
    </xsl:template>

    <xsl:template match="mods:mods/mods:originInfo/mods:edition">
        <field_edition>
            <xsl:value-of select="normalize-space()"/>
        </field_edition>
    </xsl:template>

    <xsl:template match="mods:mods/mods:originInfo/mods:issuance">
        <field_mode_of_issuance>
            <xsl:value-of select="normalize-space()"/>
        </field_mode_of_issuance>
    </xsl:template>

</xsl:stylesheet>
