CREATE CONSTRAINT user_id IF NOT EXISTS
FOR (u:User) REQUIRE u.id IS UNIQUE;

CREATE CONSTRAINT document_id IF NOT EXISTS
FOR (d:Document) REQUIRE d.id IS UNIQUE;

CREATE CONSTRAINT document_version_id IF NOT EXISTS
FOR (v:DocumentVersion) REQUIRE v.id IS UNIQUE;

CREATE CONSTRAINT document_chunk_id IF NOT EXISTS
FOR (c:DocumentChunk) REQUIRE c.id IS UNIQUE;

CREATE CONSTRAINT extraction_run_id IF NOT EXISTS
FOR (r:ExtractionRun) REQUIRE r.id IS UNIQUE;

CREATE CONSTRAINT extracted_entity_id IF NOT EXISTS
FOR (e:ExtractedEntity) REQUIRE e.id IS UNIQUE;

CREATE CONSTRAINT extracted_triple_id IF NOT EXISTS
FOR (t:ExtractedTriple) REQUIRE t.id IS UNIQUE;

CREATE CONSTRAINT skill_normalized_name IF NOT EXISTS
FOR (s:Skill) REQUIRE s.normalized_name IS UNIQUE;

CREATE CONSTRAINT tool_normalized_name IF NOT EXISTS
FOR (t:Tool) REQUIRE t.normalized_name IS UNIQUE;

CREATE CONSTRAINT organization_normalized_name IF NOT EXISTS
FOR (o:Organization) REQUIRE o.normalized_name IS UNIQUE;

CREATE CONSTRAINT role_normalized_name IF NOT EXISTS
FOR (r:Role) REQUIRE r.normalized_name IS UNIQUE;

CREATE CONSTRAINT project_normalized_name IF NOT EXISTS
FOR (p:Project) REQUIRE p.normalized_name IS UNIQUE;

CREATE CONSTRAINT experience_id IF NOT EXISTS
FOR (e:Experience) REQUIRE e.id IS UNIQUE;

CREATE CONSTRAINT education_id IF NOT EXISTS
FOR (e:Education) REQUIRE e.id IS UNIQUE;

CREATE CONSTRAINT certification_normalized_name IF NOT EXISTS
FOR (c:Certification) REQUIRE c.normalized_name IS UNIQUE;

CREATE CONSTRAINT domain_normalized_name IF NOT EXISTS
FOR (d:Domain) REQUIRE d.normalized_name IS UNIQUE;

CREATE INDEX document_source_type IF NOT EXISTS
FOR (d:Document) ON (d.source_type);

CREATE INDEX document_sha256 IF NOT EXISTS
FOR (d:Document) ON (d.sha256);

CREATE INDEX document_created_at IF NOT EXISTS
FOR (d:Document) ON (d.created_at);

CREATE INDEX document_version_status IF NOT EXISTS
FOR (v:DocumentVersion) ON (v.status);

CREATE INDEX extraction_run_status IF NOT EXISTS
FOR (r:ExtractionRun) ON (r.status);

CREATE INDEX extracted_entity_type IF NOT EXISTS
FOR (e:ExtractedEntity) ON (e.entity_type);

CREATE INDEX extracted_triple_status IF NOT EXISTS
FOR (t:ExtractedTriple) ON (t.status);
