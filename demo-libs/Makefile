# The Rocq libraries of xtext and cyp (https://github.com/thery/coq_tmp),
# built and installed from a copy of coq_tmp's main branch, made by
# scripts/demo-libs.sh. Four logical names, as in coq_tmp:
#   ProofText  prooftext/  Tactics.v and the Elpi files xtext and cyp share
#   Lexicon    lexicon/    the vocabulary of each language (Elpi files)
#   XText      xtext/      ExtractText.v (ExtractText) and xtext/elpi/
#   CypV       cyp/vernac/ Gaps.v, Cyp.v (Cyp Lemma, CypFile) and elpi/
# The .elpi files are installed beside the .vo: ExtractText.v and Cyp.v load
# them with From ... Extra Dependency.
LOAD = -Q prooftext ProofText -Q lexicon Lexicon -R xtext XText -Q cyp/vernac CypV
ROCQ = rocq c -w -notation-overridden $(LOAD)
CONTRIB = $(shell rocq -where)/user-contrib

all: prooftext/Tactics.vo xtext/ExtractText.vo cyp/vernac/Gaps.vo cyp/vernac/Cyp.vo

prooftext/Tactics.vo: prooftext/Tactics.v
	$(ROCQ) $<
xtext/ExtractText.vo: xtext/ExtractText.v prooftext/Tactics.vo $(wildcard xtext/elpi/*.elpi lexicon/*.elpi prooftext/*.elpi)
	$(ROCQ) $<
cyp/vernac/Gaps.vo: cyp/vernac/Gaps.v prooftext/Tactics.vo
	$(ROCQ) $<
cyp/vernac/Cyp.vo: cyp/vernac/Cyp.v cyp/vernac/Gaps.vo $(wildcard cyp/vernac/elpi/*.elpi lexicon/*.elpi prooftext/*.elpi)
	$(ROCQ) $<

# install DIR/FILES into user-contrib/NAME/
put = mkdir -p $(CONTRIB)/$(1) && cd $(2) && cp --parents $(3) $(CONTRIB)/$(1)/

install: all
	$(call put,ProofText,prooftext,Tactics.v Tactics.vo Tactics.glob *.elpi)
	$(call put,Lexicon,lexicon,*.elpi)
	$(call put,XText,xtext,ExtractText.v ExtractText.vo ExtractText.glob elpi/*.elpi)
	$(call put,CypV,cyp/vernac,Gaps.v Gaps.vo Gaps.glob Cyp.v Cyp.vo Cyp.glob elpi/*.elpi)

uninstall:
	rm -rf $(CONTRIB)/ProofText $(CONTRIB)/Lexicon $(CONTRIB)/XText $(CONTRIB)/CypV

.PHONY: all install uninstall
